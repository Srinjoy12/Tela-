import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';

const router = Router();

function normalizeAuthEmail(input: string): string {
  const trimmed = (input || '').trim();
  const cleaned = trimmed.replace(/\D/g, '');
  if (/^\d{10}$/.test(cleaned)) {
    return `${cleaned}@tela.app`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `${cleaned.slice(2)}@tela.app`;
  }
  return trimmed.toLowerCase();
}

/**
 * POST /api/auth/register
 * Register a new user via Supabase Auth (admin auto-confirm) and create their shop profile.
 */
router.post('/register', async (req, res) => {
  const { email, password, shopName, ownerName, phone, businessType, language, address } = req.body;

  if (!email || !password || !shopName || !ownerName) {
    return res.status(400).json({ success: false, error: 'Email, password, shop name, and owner name are required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured on the server.' });
  }

  try {
    const authEmail = normalizeAuthEmail(email);

    // 1. Create user via Supabase Admin Auth (auto-confirms email)
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        shop_name: shopName,
        owner_name: ownerName,
        phone: phone || '',
        business_type: businessType || 'Saree',
      },
    });

    if (authError) {
      // If user already exists, return friendly message
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return res.status(409).json({ success: false, error: 'An account with this email/phone already exists. Please Sign In instead.' });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // 2. Create shop profile in the shops table, linked to auth user
    const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentMonth = new Date().toISOString().substring(0, 7);

    const basePayload = {
      id: shopId,
      name: shopName.trim(),
      owner_name: ownerName.trim(),
      phone: (phone || '').trim(),
      email: authEmail,
      business_type: businessType || 'Saree',
      language: language || 'en',
      address: address || null,
      created_at: new Date().toISOString(),
    };

    // Try inserting with user_id first (preferred)
    let shopData: any = null;
    const { data: withUserIdData, error: withUserIdError } = await supabaseServer
      .from('shops')
      .insert({ ...basePayload, user_id: userId })
      .select()
      .single();

    if (withUserIdError && withUserIdError.message?.includes('user_id')) {
      // user_id column not yet in Supabase schema, insert without user_id
      const { data: fallbackData, error: fallbackError } = await supabaseServer
        .from('shops')
        .insert(basePayload)
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      shopData = fallbackData;
    } else if (withUserIdError) {
      throw withUserIdError;
    } else {
      shopData = withUserIdData;
    }

    // 3. Seed a default monthly goal for the new shop
    await supabaseServer.from('goals').insert({
      id: `goal_${shopId}_${currentMonth}`,
      shop_id: shopId,
      month: currentMonth,
      profit_target: 50000,
      sales_target: 150000,
      pieces_target: 50,
    });

    const formattedShop = {
      id: shopData.id,
      name: shopData.name,
      ownerName: shopData.owner_name,
      phone: shopData.phone,
      email: shopData.email,
      businessType: shopData.business_type,
      language: shopData.language,
      address: shopData.address,
      createdAt: shopData.created_at,
    };

    res.status(201).json({ success: true, data: { user: authData.user, shop: formattedShop } });
  } catch (err: any) {
    console.error('[Auth Register] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/auth/shops
 * Fetch shop profiles linked to the authenticated Supabase user.
 * Protected: prevents unauthorized scraping of store profiles and phone numbers.
 */
router.get('/shops', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service is currently unavailable.' });
  }

  const userId = req.user.id;
  const authEmail = (req.user.email || '').toLowerCase();

  try {
    const { data, error } = await supabaseServer
      .from('shops')
      .select('*')
      .or(`user_id.eq.${userId},email.ilike.${authEmail}`);

    if (error) throw error;

    const shops = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      ownerName: s.owner_name,
      phone: s.phone,
      email: s.email,
      businessType: s.business_type,
      language: s.language,
      address: s.address,
      createdAt: s.created_at,
    }));

    res.json({ success: true, data: shops });
  } catch (err: any) {
    console.error('[Auth Shops] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch shops.' });
  }
});

/**
 * GET /api/auth/all-shops
 * Admin-only: Fetch all registered shops (fleet monitoring).
 * Protected by requireAuth and requireAdmin.
 */
router.get('/all-shops', requireAuth, requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service is currently unavailable.' });
  }

  try {
    const { data, error } = await supabaseServer.from('shops').select('*');
    if (error) throw error;

    const shops = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      ownerName: s.owner_name,
      phone: s.phone,
      email: s.email,
      businessType: s.business_type,
      language: s.language,
      address: s.address,
      createdAt: s.created_at,
    }));

    res.json({ success: true, data: shops });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
