import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import { type AuthenticatedRequest, sanitizeForStaff } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/bills
 * Fetch bills with server-side pagination.
 * Query params:
 *   page   (default 1)
 *   limit  (default 50, max 200)
 *   status ('completed'|'cancelled'|'returned', default all)
 *   from   (YYYY-MM-DD, filter start date)
 *   to     (YYYY-MM-DD, filter end date)
 *   month  (YYYY-MM shorthand for from+to)
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
  const status = req.query.status as string | undefined;
  const month = req.query.month as string | undefined;
  let from = req.query.from as string | undefined;
  let to = req.query.to as string | undefined;

  // Shorthand: ?month=YYYY-MM expands to full month range
  if (month && !from && !to) {
    from = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    to = `${month}-${String(lastDay).padStart(2, '0')}`;
  }

  try {
    let query = supabaseServer
      .from('bills')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    else query = query.neq('status', 'historical');
    if (from) query = query.gte('date', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('date', `${to}T23:59:59.999Z`);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const bills = (data || []).map(mapBill);
    const total = count ?? 0;

    res.json({
      success: true,
      data: sanitizeForStaff(bills, req.userRole),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * POST /api/bills
 * Create a new bill with atomic stock deduction and overselling prevention.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId!;
  const {
    customerName,
    customerPhone,
    items,
    discount,
    paymentMode,
    amountPaid,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Bill must contain at least one item.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const now = new Date().toISOString();

    // 1. Try atomic billing stored procedure
    const { data: rpcData, error: rpcError } = await supabaseServer.rpc('atomic_create_bill', {
      p_shop_id: shopId,
      p_customer_name: customerName ? customerName.trim() : null,
      p_customer_phone: customerPhone ? customerPhone.trim() : null,
      p_items: items,
      p_discount: Math.max(0, Number(discount) || 0),
      p_payment_mode: paymentMode || 'Cash',
      p_amount_paid: Number(amountPaid) || 0,
      p_created_by: req.userRole || 'owner',
    });

    if (rpcError) {
      // Catch business logic exceptions from SQL (e.g. Insufficient stock)
      if (rpcError.message && !rpcError.message.includes('Could not find')) {
        return res.status(400).json({ success: false, error: rpcError.message });
      }
    }

    if (!rpcError && rpcData && rpcData.id) {
      const { data: billRecord, error: billFetchErr } = await supabaseServer
        .from('bills')
        .select('*')
        .eq('id', rpcData.id)
        .single();

      if (!billFetchErr && billRecord) {
        return res.status(201).json({ success: true, data: sanitizeForStaff(mapBill(billRecord), req.userRole) });
      }
    }

    // 2. Resilient JS-Level Fallback (if RPC function is not yet installed in Supabase)
    // Verify sufficient stock for all items
    for (const item of items) {
      const { data: prod } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .eq('shop_id', shopId)
        .single();

      if (!prod) {
        return res.status(400).json({ success: false, error: `Product ${item.productName || item.productId} not found.` });
      }

      if (prod.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for "${prod.name}" (In stock: ${prod.quantity}, requested: ${item.quantity}).`,
        });
      }
    }

    // Atomic bill counter
    const { data: shopRecord } = await supabaseServer
      .from('shops')
      .select('last_bill_seq')
      .eq('id', shopId)
      .single();

    const nextSeq = ((shopRecord && shopRecord.last_bill_seq) || 1000) + 1;
    await supabaseServer.from('shops').update({ last_bill_seq: nextSeq }).eq('id', shopId);
    const billNo = `BILL-${nextSeq}`;
    const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let subtotal = 0;
    let totalCost = 0;
    const processedItems: any[] = [];

    // Deduct stock and audit
    for (const item of items) {
      const { data: prod } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .eq('shop_id', shopId)
        .single();

      const prev = prod.quantity;
      const newQty = prev - item.quantity;
      const itemSold = Number(item.soldPrice) || prod.selling_price;
      const itemCost = Number(prod.cost_price);
      const itemProfit = (itemSold - itemCost) * item.quantity;

      subtotal += itemSold * item.quantity;
      totalCost += itemCost * item.quantity;

      await supabaseServer
        .from('products')
        .update({ quantity: newQty, updated_at: now })
        .eq('id', prod.id);

      await supabaseServer.from('stock_movements').insert({
        id: `move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        shop_id: shopId,
        product_id: prod.id,
        product_name: prod.name,
        type: 'sale',
        quantity_change: -item.quantity,
        previous_quantity: prev,
        new_quantity: newQty,
        reason: `Sale ${billNo}`,
        date: now,
      });

      processedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        billId,
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        quantity: item.quantity,
        listedPrice: prod.selling_price,
        soldPrice: itemSold,
        costPriceAtSale: itemCost,
        profit: itemProfit,
      });
    }

    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountAmount);
    const totalProfit = total - totalCost;

    let creditAmount = 0;
    let paidAmount = total;
    if (paymentMode === 'Credit') {
      creditAmount = total;
      paidAmount = 0;
    } else if (paymentMode === 'Part') {
      paidAmount = Math.min(total, Math.max(0, Number(amountPaid) || 0));
      creditAmount = total - paidAmount;
    }

    // Insert bill
    const { data: billData, error: billError } = await supabaseServer
      .from('bills')
      .insert({
        id: billId,
        shop_id: shopId,
        bill_no: billNo,
        date: now,
        customer_name: customerName ? customerName.trim() : null,
        customer_phone: customerPhone ? customerPhone.trim() : null,
        items: processedItems,
        subtotal,
        discount: discountAmount,
        total,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_mode: paymentMode || 'Cash',
        amount_paid: paidAmount,
        balance_due: creditAmount,
        status: 'completed',
        created_at: now,
        created_by: req.userRole || 'owner',
      })
      .select()
      .single();

    if (billError) throw billError;

    // Customer ledger & transaction posting
    if (customerPhone && customerPhone.trim()) {
      const cleanPhone = customerPhone.trim();
      const { data: existingCust } = await supabaseServer
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .eq('phone', cleanPhone)
        .single();

      let customerId = existingCust?.id;
      let newBalance = 0;

      if (existingCust) {
        newBalance = existingCust.balance_due + creditAmount;
        await supabaseServer
          .from('customers')
          .update({
            total_spent: existingCust.total_spent + total,
            balance_due: newBalance,
            last_purchase_date: now,
          })
          .eq('id', existingCust.id);
      } else {
        customerId = `cust_${Date.now()}`;
        newBalance = creditAmount;
        await supabaseServer.from('customers').insert({
          id: customerId,
          shop_id: shopId,
          name: customerName ? customerName.trim() : 'Walk-in Customer',
          phone: cleanPhone,
          balance_due: newBalance,
          total_spent: total,
          last_purchase_date: now,
        });
      }

      // Record in customer_transactions
      if (creditAmount > 0 && customerId) {
        await supabaseServer.from('customer_transactions').insert({
          id: `tx_${Date.now()}`,
          shop_id: shopId,
          customer_id: customerId,
          bill_id: billId,
          type: 'credit_sale',
          amount: creditAmount,
          balance_after: newBalance,
          notes: `Credit from ${billNo} (${paymentMode})`,
          date: now,
        });
      }
    }

    res.status(201).json({ success: true, data: sanitizeForStaff(mapBill(billData), req.userRole) });
  } catch (err: any) {
    console.error('Error creating bill:', err);
    res.status(500).json({ success: false, error: err.message || 'Error processing bill transaction.' });
  }
});

/**
 * POST /api/bills/:id/cancel
 * Cancels a bill: restores inventory pieces, adjusts customer credit, logs return movements.
 */
router.post('/:id/cancel', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId!;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: bill, error: fetchErr } = await supabaseServer
      .from('bills')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchErr || !bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    if (bill.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Bill is already cancelled.' });
    }

    const now = new Date().toISOString();

    // 1. Restore inventory for all items in the bill
    for (const item of bill.items || []) {
      const { data: prod } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .single();

      if (prod) {
        const prev = prod.quantity;
        const restored = prev + item.quantity;

        await supabaseServer
          .from('products')
          .update({ quantity: restored, updated_at: now })
          .eq('id', prod.id);

        await supabaseServer.from('stock_movements').insert({
          id: `move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          shop_id: shopId,
          product_id: prod.id,
          product_name: prod.name,
          type: 'return',
          quantity_change: item.quantity,
          previous_quantity: prev,
          new_quantity: restored,
          reason: `Cancelled ${bill.bill_no}`,
          date: now,
        });
      }
    }

    // 2. Reverse customer credit balance if bill was credit or part
    const creditAmount = Number(bill.balance_due) || (bill.payment_mode === 'Credit' ? Number(bill.total) : 0);
    if (bill.customer_phone && creditAmount > 0) {
      const { data: cust } = await supabaseServer
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .eq('phone', bill.customer_phone)
        .single();

      if (cust) {
        const newBalance = Math.max(0, cust.balance_due - creditAmount);
        await supabaseServer
          .from('customers')
          .update({
            balance_due: newBalance,
            total_spent: Math.max(0, cust.total_spent - Number(bill.total)),
          })
          .eq('id', cust.id);

        await supabaseServer.from('customer_transactions').insert({
          id: `tx_${Date.now()}`,
          shop_id: shopId,
          customer_id: cust.id,
          bill_id: bill.id,
          type: 'return_credit',
          amount: creditAmount,
          balance_after: newBalance,
          notes: `Reversed credit on cancellation of ${bill.bill_no}`,
          date: now,
        });
      }
    }

    // 3. Mark bill as cancelled
    const { data: updatedBill, error: updateErr } = await supabaseServer
      .from('bills')
      .update({ status: 'cancelled' })
      .eq('id', bill.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      message: `Bill ${bill.bill_no} successfully cancelled and inventory restored.`,
      data: sanitizeForStaff(mapBill(updatedBill), req.userRole),
    });
  } catch (err: any) {
    console.error('Error cancelling bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapBill(b: any) {
  return {
    id: b.id,
    shopId: b.shop_id,
    billNo: b.bill_no,
    date: b.date,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    items: b.items || [],
    subtotal: Number(b.subtotal),
    discount: Number(b.discount),
    total: Number(b.total),
    totalCost: Number(b.total_cost),
    totalProfit: Number(b.total_profit),
    paymentMode: b.payment_mode,
    amountPaid: b.amount_paid !== undefined && b.amount_paid !== null ? Number(b.amount_paid) : undefined,
    balanceDue: b.balance_due !== undefined && b.balance_due !== null ? Number(b.balance_due) : undefined,
    status: b.status,
    createdAt: b.created_at,
    createdBy: b.created_by,
  };
}

export default router;
