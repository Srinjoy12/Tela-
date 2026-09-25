import type { Request, Response, NextFunction } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
  shopId?: string;
  shop?: any;
  userRole?: 'owner' | 'staff' | 'admin';
}

/**
 * Validates Supabase JWT from Authorization header and sets req.user
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service is currently unavailable.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session.' });
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error('[Auth Middleware] Token verification failed:', err);
    return res.status(500).json({ success: false, error: 'Authentication verification failure.' });
  }
};

/**
 * Multi-Tenant Authorization:
 * Ensures the authenticated user actually owns or is registered to access the target shop.
 * Prevents IDOR (Insecure Direct Object Reference) where User A could query User B's shop data.
 */
export const requireShop = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'User not authenticated.' });
  }

  if (!supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  // 1. Resolve requested shopId from query, route params, or body
  const rawShopId =
    (req.query.shopId as string) ||
    (req.params.shopId as string) ||
    (req.body && req.body.shopId) ||
    '';

  const userEmail = (req.user.email || '').toLowerCase();
  const userId = req.user.id;

  // Check if user is platform administrator
  const adminSecret = process.env.ADMIN_SECRET_KEY || '';
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const headerAdminKey = (req.headers['x-admin-key'] as string) || '';

  const isAdmin =
    (adminSecret && headerAdminKey === adminSecret) ||
    (adminEmail && userEmail === adminEmail) ||
    req.user.user_metadata?.role === 'admin';

  try {
    // 2. Fetch shops belonging to this user
    const { data: userShops, error: shopErr } = await supabaseServer
      .from('shops')
      .select('*')
      .or(`user_id.eq.${userId},email.ilike.${userEmail}`);

    if (shopErr) throw shopErr;

    if (!userShops || userShops.length === 0) {
      if (isAdmin) {
        // Admin can inspect any shop
        if (rawShopId) {
          const { data: adminShop } = await supabaseServer
            .from('shops')
            .select('*')
            .eq('id', rawShopId)
            .single();
          if (adminShop) {
            req.shopId = adminShop.id;
            req.shop = adminShop;
            req.userRole = 'admin';
            return next();
          }
        }
      }
      return res.status(404).json({
        success: false,
        error: 'No shop profile linked to this authenticated account. Please register your store.',
      });
    }

    // 3. Match requested shopId against user's verified shops
    let matchedShop = null;
    if (rawShopId) {
      matchedShop = userShops.find((s: any) => s.id === rawShopId);
      if (!matchedShop && isAdmin) {
        // Admin accessing a specific shop
        const { data: targetShop } = await supabaseServer
          .from('shops')
          .select('*')
          .eq('id', rawShopId)
          .single();
        if (targetShop) {
          req.shopId = targetShop.id;
          req.shop = targetShop;
          req.userRole = 'admin';
          return next();
        }
      }
    } else {
      // Default to user's first shop if not specified in query
      matchedShop = userShops[0];
    }

    if (!matchedShop) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to view or modify this store.',
      });
    }

    req.shopId = matchedShop.id;
    req.shop = matchedShop;

    // Check header for staff simulation / staff account
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    req.userRole = roleHeader === 'staff' ? 'staff' : (req.user.user_metadata?.role === 'staff' ? 'staff' : 'owner');

    next();
  } catch (err: any) {
    console.error('[Tenant Authorization Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify shop authorization.' });
  }
};

/**
 * Restricts access to Super Admin only
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const adminSecret = process.env.ADMIN_SECRET_KEY || '';
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const headerAdminKey = (req.headers['x-admin-key'] as string) || '';

  // Check header secret key
  if (adminSecret && headerAdminKey === adminSecret) {
    req.userRole = 'admin';
    return next();
  }

  // Check authenticated user
  if (req.user) {
    const userEmail = (req.user.email || '').toLowerCase();
    if ((adminEmail && userEmail === adminEmail) || req.user.user_metadata?.role === 'admin') {
      req.userRole = 'admin';
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Access Denied: Master Administrator credentials required.',
  });
};

/**
 * Strips confidential cost and margin data from objects when staff role is active
 */
export function sanitizeForStaff(data: any, role?: string): any {
  if (role !== 'staff') return data;
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForStaff(item, role));
  }

  if (typeof data === 'object') {
    const copy = { ...data };
    // Strip cost and profit
    delete copy.costPrice;
    delete copy.cost_price;
    delete copy.costPriceAtSale;
    delete copy.totalCost;
    delete copy.total_cost;
    delete copy.totalProfit;
    delete copy.total_profit;
    delete copy.profit;
    delete copy.cogs;

    // Sanitize nested items
    if (copy.items && Array.isArray(copy.items)) {
      copy.items = copy.items.map((item: any) => sanitizeForStaff(item, role));
    }
    return copy;
  }

  return data;
}
