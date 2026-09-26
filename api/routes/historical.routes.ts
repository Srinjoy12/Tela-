import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import { type AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/historical/stats
 * Get aggregated stats from historical uploads
 */
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  if (!shopId || !isSupabaseConfigured() || !supabaseServer) {
    return res.status(400).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: bills, error } = await supabaseServer
      .from('bills')
      .select('total_cost, total, total_profit, items')
      .eq('shop_id', shopId)
      .eq('status', 'historical');

    if (error) throw error;

    let totalInvested = 0;
    let totalSales = 0;
    let totalProfit = 0;
    let totalPieces = 0;

    for (const bill of bills || []) {
      totalInvested += Number(bill.total_cost || 0);
      totalSales += Number(bill.total || 0);
      totalProfit += Number(bill.total_profit || 0);
      
      const items = typeof bill.items === 'string' ? JSON.parse(bill.items) : bill.items;
      for (const item of items || []) {
        totalPieces += Number(item.quantity || 0);
      }
    }

    res.json({
      success: true,
      data: {
        totalInvested,
        totalSales,
        totalProfit,
        totalPieces
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/historical/upload
 * Process historical data and store it in bills with status='historical'
 */
router.post('/upload', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const { rows } = req.body;

  if (!shopId || !isSupabaseConfigured() || !supabaseServer) {
    return res.status(400).json({ success: false, error: 'Database service unavailable.' });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: 'No data to import.' });
  }

  try {
    const timestamp = Date.now();
    let skuCounter = 1;
    let batch = [];

    // Create a single dummy bill per chunk to avoid massive row limits, 
    // or just group all rows into a few bills.
    // Let's create one bill per 500 items.
    
    let currentBillItems = [];
    let subtotal = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    for (const row of rows) {
      const qty = Math.max(0, Number(row.quantity) || 1);
      const cost = Math.max(0, Number(row.costPrice) || 0);
      const sold = Math.max(0, Number(row.soldPrice) || 0);
      const name = row.name || `Historical Item ${skuCounter}`;
      
      const profit = (sold - cost) * qty;

      currentBillItems.push({
        id: `hist_item_${timestamp}_${skuCounter++}`,
        productName: name,
        category: row.category || 'Legacy',
        quantity: qty,
        listedPrice: sold,
        soldPrice: sold,
        costPriceAtSale: cost,
        profit: profit
      });

      subtotal += sold * qty;
      totalCost += cost * qty;
      totalProfit += profit;

      if (currentBillItems.length >= 500) {
        batch.push({
          id: `bill_hist_${timestamp}_${batch.length}`,
          shop_id: shopId,
          bill_no: `LEGACY-${timestamp}-${batch.length}`,
          date: new Date().toISOString(),
          customer_name: 'Historical Bulk Import',
          items: currentBillItems,
          subtotal: subtotal,
          discount: 0,
          total: subtotal,
          total_cost: totalCost,
          total_profit: totalProfit,
          payment_mode: 'Cash',
          amount_paid: subtotal,
          status: 'historical', // EXCLUDES FROM CURRENT REPORTS
          created_by: 'owner'
        });
        currentBillItems = [];
        subtotal = 0;
        totalCost = 0;
        totalProfit = 0;
      }
    }

    if (currentBillItems.length > 0) {
      batch.push({
        id: `bill_hist_${timestamp}_${batch.length}`,
        shop_id: shopId,
        bill_no: `LEGACY-${timestamp}-${batch.length}`,
        date: new Date().toISOString(),
        customer_name: 'Historical Bulk Import',
        items: currentBillItems,
        subtotal: subtotal,
        discount: 0,
        total: subtotal,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_mode: 'Cash',
        amount_paid: subtotal,
        status: 'historical',
        created_by: 'owner'
      });
    }

    const { error } = await supabaseServer.from('bills').insert(batch);
    if (error) throw error;

    res.json({ success: true, data: { recordsProcessed: rows.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
