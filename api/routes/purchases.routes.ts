import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import type { PurchaseOrder } from '../types';

const router = Router();

/**
 * GET /api/purchases
 * List purchase orders with optional filtering and pagination.
 * Query params: page, limit, supplierId, productId
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  const supplierId = (req.query.supplierId as string || '').trim();
  const productId = (req.query.productId as string || '').trim();

  try {
    let query = supabaseServer
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('date', { ascending: false });

    if (supplierId) query = query.eq('supplier_id', supplierId);
    if (productId) query = query.eq('product_id', productId);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const purchases: PurchaseOrder[] = (data || []).map((po: any) => ({
      id: po.id,
      shopId: po.shop_id,
      supplierId: po.supplier_id || undefined,
      supplierName: po.supplier_name,
      productId: po.product_id || undefined,
      productName: po.product_name,
      quantity: po.quantity,
      unitCost: Number(po.unit_cost),
      totalCost: Number(po.total_cost),
      amountPaid: Number(po.amount_paid),
      balanceDue: Number(po.balance_due),
      notes: po.notes || undefined,
      date: po.date,
      createdAt: po.created_at,
    }));

    const total = count ?? 0;

    res.json({
      success: true,
      data: purchases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[Purchases/GET]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/purchases
 * Record a purchase order from a supplier, increase inventory, and log stock movement.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const {
    supplierId,
    supplierName,
    productId,
    productName,
    quantity,
    unitCost,
    amountPaid,
    notes,
    date,
  } = req.body;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  const validQty = parseInt(quantity);
  const validUnitCost = Math.max(0, Number(unitCost) || 0);

  if (!validQty || validQty <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive quantity is required.' });
  }

  if (!supplierName || !supplierName.trim()) {
    return res.status(400).json({ success: false, error: 'Supplier name is required.' });
  }

  if (!productName || !productName.trim()) {
    return res.status(400).json({ success: false, error: 'Product name is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const totalCost = validQty * validUnitCost;
  const paid = Math.min(totalCost, Math.max(0, Number(amountPaid) || 0));
  const balanceDue = totalCost - paid;
  const poId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const poDate = date ? new Date(date).toISOString() : new Date().toISOString();
  const now = new Date().toISOString();

  try {
    // 1. If supplierId not provided, check if a supplier with the same name exists
    let resolvedSupplierId = supplierId || null;
    if (!resolvedSupplierId) {
      const { data: matchedSupplier } = await supabaseServer
        .from('suppliers')
        .select('id')
        .eq('shop_id', shopId)
        .ilike('name', supplierName.trim())
        .maybeSingle();

      if (matchedSupplier) {
        resolvedSupplierId = matchedSupplier.id;
      }
    }

    // 2. Insert purchase order
    const { data: poData, error: poError } = await supabaseServer
      .from('purchase_orders')
      .insert({
        id: poId,
        shop_id: shopId,
        supplier_id: resolvedSupplierId,
        supplier_name: supplierName.trim(),
        product_id: productId || null,
        product_name: productName.trim(),
        quantity: validQty,
        unit_cost: validUnitCost,
        total_cost: totalCost,
        amount_paid: paid,
        balance_due: balanceDue,
        notes: notes ? notes.trim() : null,
        date: poDate,
        created_at: now,
      })
      .select()
      .single();

    if (poError) throw poError;

    // 3. If tied to an existing product in inventory, update product stock and record movement
    if (productId) {
      const { data: prod } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('shop_id', shopId)
        .single();

      if (prod) {
        const prevQty = Number(prod.quantity) || 0;
        const newQty = prevQty + validQty;

        // Update product stock and optionally link supplier_id
        await supabaseServer
          .from('products')
          .update({
            quantity: newQty,
            supplier_id: resolvedSupplierId || prod.supplier_id,
            updated_at: now,
          })
          .eq('id', productId)
          .eq('shop_id', shopId);

        // Record stock movement
        await supabaseServer.from('stock_movements').insert({
          id: `move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          shop_id: shopId,
          product_id: productId,
          product_name: prod.name,
          type: 'purchase',
          quantity_change: validQty,
          previous_quantity: prevQty,
          new_quantity: newQty,
          reason: `Restocked from ${supplierName.trim()} (PO #${poId.slice(-6)})`,
          date: poDate,
        });
      }
    }

    const mapped: PurchaseOrder = {
      id: poData.id,
      shopId: poData.shop_id,
      supplierId: poData.supplier_id || undefined,
      supplierName: poData.supplier_name,
      productId: poData.product_id || undefined,
      productName: poData.product_name,
      quantity: poData.quantity,
      unitCost: Number(poData.unit_cost),
      totalCost: Number(poData.total_cost),
      amountPaid: Number(poData.amount_paid),
      balanceDue: Number(poData.balance_due),
      notes: poData.notes || undefined,
      date: poData.date,
      createdAt: poData.created_at,
    };

    res.status(201).json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('[Purchases/POST]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/purchases/:id/pay
 * Record payment to supplier for an outstanding purchase order.
 */
router.post('/:id/pay', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;
  const { amount, notes } = req.body;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive payment amount is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: po, error: fetchErr } = await supabaseServer
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchErr || !po) {
      return res.status(404).json({ success: false, error: 'Purchase order not found.' });
    }

    const currentBalance = Number(po.balance_due) || 0;
    const currentPaid = Number(po.amount_paid) || 0;

    if (currentBalance <= 0) {
      return res.status(400).json({ success: false, error: 'This purchase order is already fully paid.' });
    }

    const actualPayment = Math.min(currentBalance, paymentAmount);
    const newPaid = currentPaid + actualPayment;
    const newBalance = Math.max(0, currentBalance - actualPayment);

    const updatedNotes = notes
      ? `${po.notes ? po.notes + ' | ' : ''}Paid ₹${actualPayment} on ${new Date().toLocaleDateString('en-IN')}: ${notes}`
      : po.notes;

    const { data: updated, error: updateErr } = await supabaseServer
      .from('purchase_orders')
      .update({
        amount_paid: newPaid,
        balance_due: newBalance,
        notes: updatedNotes,
      })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const mapped: PurchaseOrder = {
      id: updated.id,
      shopId: updated.shop_id,
      supplierId: updated.supplier_id || undefined,
      supplierName: updated.supplier_name,
      productId: updated.product_id || undefined,
      productName: updated.product_name,
      quantity: updated.quantity,
      unitCost: Number(updated.unit_cost),
      totalCost: Number(updated.total_cost),
      amountPaid: Number(updated.amount_paid),
      balanceDue: Number(updated.balance_due),
      notes: updated.notes || undefined,
      date: updated.date,
      createdAt: updated.created_at,
    };

    res.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('[Purchases/:id/pay]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
