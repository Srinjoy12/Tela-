import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/customers
 * Fetch customers with server-side pagination and search.
 * Query params: page, limit, search
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
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  const search = (req.query.search as string || '').trim();

  try {
    let query = supabaseServer
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('last_purchase_date', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const customers = (data || []).map(mapCustomer);
    const total = count ?? 0;

    res.json({
      success: true,
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/customers
 * Create a new customer in shop ledger.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId!;
  const { name, phone, balanceDue, notes } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Customer name and phone number are required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const initialBalance = Math.max(0, Number(balanceDue) || 0);
  const customerId = `cust_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabaseServer
      .from('customers')
      .insert({
        id: customerId,
        shop_id: shopId,
        name: name.trim(),
        phone: phone.trim(),
        balance_due: initialBalance,
        total_spent: 0,
        last_purchase_date: now,
      })
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('unique')) {
        return res.status(409).json({ success: false, error: 'A customer with this phone number already exists in your ledger.' });
      }
      throw error;
    }

    // Record initial opening balance in audit ledger if > 0
    if (initialBalance > 0) {
      await supabaseServer.from('customer_transactions').insert({
        id: `tx_${Date.now()}`,
        shop_id: shopId,
        customer_id: customerId,
        type: 'adjustment',
        amount: initialBalance,
        balance_after: initialBalance,
        notes: notes ? notes.trim() : 'Opening Udhaar balance',
        date: now,
      });
    }

    res.status(201).json({ success: true, data: mapCustomer(data) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/customers/:id/payment
 * Record a payment against a customer's Udhaar balance.
 */
router.post('/:id/payment', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId!;
  const { amount, notes } = req.body;

  const payment = Number(amount);
  if (isNaN(payment) || payment <= 0) {
    return res.status(400).json({ success: false, error: 'Valid payment amount required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: cust, error: fetchError } = await supabaseServer
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchError || !cust) {
      return res.status(404).json({ success: false, error: 'Customer not found in this store.' });
    }

    const newBalance = Math.max(0, cust.balance_due - payment);
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from('customers')
      .update({ balance_due: newBalance })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record transaction audit ledger
    await supabaseServer.from('customer_transactions').insert({
      id: `tx_${Date.now()}`,
      shop_id: shopId,
      customer_id: id,
      type: 'payment',
      amount: payment,
      balance_after: newBalance,
      notes: notes ? notes.trim() : 'Payment received at counter',
      date: now,
    });

    res.json({ success: true, data: mapCustomer(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/customers/:id/credit
 * Add credit (increase balance due) for a customer.
 */
router.post('/:id/credit', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId!;
  const { amount, notes } = req.body;

  const credit = Number(amount);
  if (isNaN(credit) || credit <= 0) {
    return res.status(400).json({ success: false, error: 'Valid credit amount required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: cust, error: fetchError } = await supabaseServer
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchError || !cust) {
      return res.status(404).json({ success: false, error: 'Customer not found in this store.' });
    }

    const newBalance = cust.balance_due + credit;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from('customers')
      .update({ balance_due: newBalance })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record transaction audit ledger
    await supabaseServer.from('customer_transactions').insert({
      id: `tx_${Date.now()}`,
      shop_id: shopId,
      customer_id: id,
      type: 'credit_sale',
      amount: credit,
      balance_after: newBalance,
      notes: notes ? notes.trim() : 'Credit added',
      date: now,
    });

    res.json({ success: true, data: mapCustomer(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/customers/:id/transactions
 * Retrieve chronological transaction ledger for a customer.
 */
router.get('/:id/transactions', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId!;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('customer_transactions')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', id)
      .order('date', { ascending: false });

    if (error) throw error;

    const transactions = (data || []).map((t: any) => ({
      id: t.id,
      shopId: t.shop_id,
      customerId: t.customer_id,
      billId: t.bill_id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      notes: t.notes,
      date: t.date,
    }));

    res.json({ success: true, data: transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapCustomer(c: any) {
  return {
    id: c.id,
    shopId: c.shop_id,
    name: c.name,
    phone: c.phone,
    balanceDue: Number(c.balance_due),
    totalSpent: Number(c.total_spent),
    lastPurchaseDate: c.last_purchase_date,
  };
}

export default router;
