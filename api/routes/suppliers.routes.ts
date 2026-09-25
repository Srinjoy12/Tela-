import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import type { Supplier } from '../types';

const router = Router();

/**
 * GET /api/suppliers
 * List all suppliers for the authenticated shop with aggregated purchase & payables totals.
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const [suppliersRes, purchasesRes] = await Promise.all([
      supabaseServer
        .from('suppliers')
        .select('*')
        .eq('shop_id', shopId)
        .order('name', { ascending: true }),
      supabaseServer
        .from('purchase_orders')
        .select('supplier_id, total_cost, amount_paid, balance_due')
        .eq('shop_id', shopId),
    ]);

    if (suppliersRes.error) throw suppliersRes.error;
    if (purchasesRes.error) throw purchasesRes.error;

    // Aggregate purchase totals by supplier_id
    const statsMap = new Map<string, { totalPurchases: number; totalPaid: number; balanceDue: number }>();
    for (const po of purchasesRes.data || []) {
      if (!po.supplier_id) continue;
      const prev = statsMap.get(po.supplier_id) || { totalPurchases: 0, totalPaid: 0, balanceDue: 0 };
      prev.totalPurchases += Number(po.total_cost || 0);
      prev.totalPaid += Number(po.amount_paid || 0);
      prev.balanceDue += Number(po.balance_due || 0);
      statsMap.set(po.supplier_id, prev);
    }

    const suppliers: Supplier[] = (suppliersRes.data || []).map((s: any) => {
      const stats = statsMap.get(s.id) || { totalPurchases: 0, totalPaid: 0, balanceDue: 0 };
      return {
        id: s.id,
        shopId: s.shop_id,
        name: s.name,
        phone: s.phone || undefined,
        address: s.address || undefined,
        gstNumber: s.gst_number || undefined,
        notes: s.notes || undefined,
        createdAt: s.created_at,
        totalPurchases: stats.totalPurchases,
        totalPaid: stats.totalPaid,
        balanceDue: stats.balanceDue,
      };
    });

    res.json({ success: true, data: suppliers });
  } catch (err: any) {
    console.error('[Suppliers/GET]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/suppliers
 * Create a new vendor/supplier for this shop.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const { name, phone, address, gstNumber, notes } = req.body;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Supplier name is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const supplierId = `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabaseServer
      .from('suppliers')
      .insert({
        id: supplierId,
        shop_id: shopId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        gst_number: gstNumber ? gstNumber.trim().toUpperCase() : null,
        notes: notes ? notes.trim() : null,
        created_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    const mapped: Supplier = {
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      phone: data.phone || undefined,
      address: data.address || undefined,
      gstNumber: data.gst_number || undefined,
      notes: data.notes || undefined,
      createdAt: data.created_at,
      totalPurchases: 0,
      totalPaid: 0,
      balanceDue: 0,
    };

    res.status(201).json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('[Suppliers/POST]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/suppliers/:id
 * Update supplier details.
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;
  const { name, phone, address, gstNumber, notes } = req.body;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
    if (address !== undefined) updatePayload.address = address ? address.trim() : null;
    if (gstNumber !== undefined) updatePayload.gst_number = gstNumber ? gstNumber.trim().toUpperCase() : null;
    if (notes !== undefined) updatePayload.notes = notes ? notes.trim() : null;

    const { data, error } = await supabaseServer
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Supplier not found.' });

    const mapped: Supplier = {
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      phone: data.phone || undefined,
      address: data.address || undefined,
      gstNumber: data.gst_number || undefined,
      notes: data.notes || undefined,
      createdAt: data.created_at,
    };

    res.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('[Suppliers/PUT]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/suppliers/:id
 * Delete a supplier. Owner only.
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;

  if (req.userRole === 'staff') {
    return res.status(403).json({ success: false, error: 'Staff members are not permitted to delete suppliers.' });
  }

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { error } = await supabaseServer
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);

    if (error) throw error;

    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (err: any) {
    console.error('[Suppliers/DELETE]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/suppliers/:id/purchases
 * List purchase orders from a specific supplier.
 */
router.get('/:id/purchases', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('purchase_orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('supplier_id', id)
      .order('date', { ascending: false });

    if (error) throw error;

    const purchases = (data || []).map((po: any) => ({
      id: po.id,
      shopId: po.shop_id,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      productId: po.product_id,
      productName: po.product_name,
      quantity: po.quantity,
      unitCost: Number(po.unit_cost),
      totalCost: Number(po.total_cost),
      amountPaid: Number(po.amount_paid),
      balanceDue: Number(po.balance_due),
      notes: po.notes,
      date: po.date,
      createdAt: po.created_at,
    }));

    res.json({ success: true, data: purchases });
  } catch (err: any) {
    console.error('[Suppliers/purchases]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
