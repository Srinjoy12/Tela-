import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import { type AuthenticatedRequest, sanitizeForStaff } from '../middleware/auth.middleware';
import type { DeadStockItem, RestockSuggestion } from '../types';

const router = Router();

// ─── Shared Aggregation Helper ────────────────────────────────────────────────
async function buildReport(shopId: string, from: string, to: string, goalMonth?: string) {
  if (!supabaseServer) throw new Error('Database service unavailable.');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const effectiveGoalMonth = goalMonth || from.substring(0, 7);

  const [productsRes, allBillsRes, rangedBillsRes, goalRes] = await Promise.all([
    supabaseServer.from('products').select('*').eq('shop_id', shopId).eq('archived', false),
    supabaseServer.from('bills').select('*').eq('shop_id', shopId).eq('status', 'completed'),
    supabaseServer
      .from('bills')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'completed')
      .gte('date', `${from}T00:00:00.000Z`)
      .lte('date', `${to}T23:59:59.999Z`),
    supabaseServer.from('goals').select('*').eq('shop_id', shopId).eq('month', effectiveGoalMonth).maybeSingle(),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (allBillsRes.error) throw allBillsRes.error;
  if (rangedBillsRes.error) throw rangedBillsRes.error;

  const products = productsRes.data || [];
  const allBills = allBillsRes.data || [];
  const rangedBills = rangedBillsRes.data || [];
  const goal = goalRes.data;

  let totalSales = 0, totalCost = 0, totalProfit = 0, piecesSold = 0;
  let discountGiven = 0, lossMakingSalesCount = 0, lossMakingTotalAmount = 0;

  for (const bill of rangedBills) {
    totalSales += Number(bill.total) || 0;
    totalCost += Number(bill.total_cost) || 0;
    totalProfit += Number(bill.total_profit) || 0;
    discountGiven += Number(bill.discount) || 0;

    for (const item of bill.items || []) {
      piecesSold += item.quantity || 0;
      const itemDiscount = ((item.listedPrice || 0) - (item.soldPrice || 0)) * (item.quantity || 0);
      if (itemDiscount > 0) discountGiven += itemDiscount;
      if ((item.profit || 0) < 0) {
        lossMakingSalesCount++;
        lossMakingTotalAmount += Math.abs(item.profit || 0);
      }
    }
  }

  const closingStockPieces = products.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0);
  const goalTarget = goal ? Number(goal.profit_target) : 50000;
  const goalAchievedPercent = goalTarget > 0 ? Math.round((totalProfit / goalTarget) * 100) : 0;
  const shortByAmount = Math.max(0, goalTarget - totalProfit);

  // Product sales map (across ALL bills for velocity & last-sale tracking)
  const productSalesMap = new Map<string, { lastSoldDate: string | null; unitsSold30d: number }>();
  for (const bill of allBills) {
    const billDate = bill.date;
    const isWithin30Days = billDate >= thirtyDaysAgo;
    for (const item of bill.items || []) {
      const prodId = item.productId;
      const existing = productSalesMap.get(prodId) || { lastSoldDate: null, unitsSold30d: 0 };
      if (!existing.lastSoldDate || billDate > existing.lastSoldDate) existing.lastSoldDate = billDate;
      if (isWithin30Days) existing.unitsSold30d += item.quantity || 0;
      productSalesMap.set(prodId, existing);
    }
  }

  // Restock suggestions
  const restockSuggestions: RestockSuggestion[] = [];
  for (const p of products) {
    const salesInfo = productSalesMap.get(p.id) || { lastSoldDate: null, unitsSold30d: 0 };
    const dailyVelocity = salesInfo.unitsSold30d / 30;
    const daysLeft = dailyVelocity > 0 ? Math.round(p.quantity / dailyVelocity) : (p.quantity <= p.alert_level ? 3 : 99);
    if (p.quantity <= p.alert_level || (dailyVelocity > 0 && daysLeft <= 10)) {
      restockSuggestions.push({
        id: p.id, name: p.name, code: p.code, category: p.category,
        quantity: p.quantity, alertLevel: p.alert_level,
        unitsSoldLast30Days: salesInfo.unitsSold30d,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        daysLeft: Math.max(1, daysLeft),
      });
    }
  }

  // Dead stock aging
  const deadStock: DeadStockItem[] = [];
  const deadStockAgingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const now = Date.now();

  for (const p of products) {
    if (p.quantity <= 0) continue;
    const salesInfo = productSalesMap.get(p.id);
    const referenceDate = salesInfo?.lastSoldDate || p.created_at;
    const daysSince = Math.floor((now - new Date(referenceDate).getTime()) / 86400000);
    const locked = p.quantity * Number(p.cost_price);

    let bucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
    if (daysSince > 90) { bucket = '90+'; deadStockAgingBuckets['90+'] += locked; }
    else if (daysSince > 60) { bucket = '61-90'; deadStockAgingBuckets['61-90'] += locked; }
    else if (daysSince > 30) { bucket = '31-60'; deadStockAgingBuckets['31-60'] += locked; }
    else { deadStockAgingBuckets['0-30'] += locked; }

    if (daysSince >= 60) {
      deadStock.push({
        id: p.id, name: p.name, code: p.code, category: p.category, quantity: p.quantity,
        costPrice: Number(p.cost_price), capitalLocked: locked,
        lastSoldDate: salesInfo?.lastSoldDate || null, daysSinceLastSale: daysSince, agingBucket: bucket,
      });
    }
  }

  return {
    month: effectiveGoalMonth,
    openingStockPieces: closingStockPieces + piecesSold,
    restockedPieces: 0,
    soldPieces: piecesSold,
    closingStockPieces,
    totalSales,
    cogs: totalCost,
    totalProfit,
    discountGiven,
    discountAvgPercent: totalSales > 0 ? Math.round((discountGiven / (totalSales + discountGiven)) * 100) : 0,
    goalTarget,
    goalAchievedPercent,
    shortByAmount,
    restockSuggestions,
    deadStock,
    deadStockAgingBuckets,
    lossMakingSalesCount,
    lossMakingTotalAmount,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/reports/monthly
 * Generate monthly P&L for a given YYYY-MM month.
 */
router.get('/monthly', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  if (!shopId) return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const summary = await buildReport(shopId, `${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`, month);
    res.json({ success: true, data: sanitizeForStaff(summary, req.userRole) });
  } catch (err: any) {
    console.error('[Reports/monthly]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/range
 * Generate P&L for a custom date range.
 * Query params: from=YYYY-MM-DD  to=YYYY-MM-DD
 */
router.get('/range', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const from = req.query.from as string;
  const to = req.query.to as string;

  if (!shopId) return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  if (!from || !to) return res.status(400).json({ success: false, error: 'from and to date params are required (YYYY-MM-DD).' });
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const summary = await buildReport(shopId, from, to, from.substring(0, 7));
    res.json({ success: true, data: sanitizeForStaff({ ...summary, from, to }, req.userRole) });
  } catch (err: any) {
    console.error('[Reports/range]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/compare
 * Month-on-month comparison: returns current month vs previous month.
 * Query params: month=YYYY-MM (current month to compare)
 */
router.get('/compare', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  if (!shopId) return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    // Previous month
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1); // month is 1-indexed, m-2 gives previous
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();

    const curLastDay = new Date(y, m, 0).getDate();

    const [current, previous] = await Promise.all([
      buildReport(shopId, `${month}-01`, `${month}-${String(curLastDay).padStart(2, '0')}`, month),
      buildReport(shopId, `${prevMonth}-01`, `${prevMonth}-${String(prevLastDay).padStart(2, '0')}`, prevMonth),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    const comparison = {
      current,
      previous,
      salesChange: pct(current.totalSales, previous.totalSales),
      profitChange: pct(current.totalProfit, previous.totalProfit),
      piecesSoldChange: pct(current.soldPieces, previous.soldPieces),
    };

    res.json({ success: true, data: sanitizeForStaff(comparison, req.userRole) });
  } catch (err: any) {
    console.error('[Reports/compare]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/goal-history
 * Returns last N months of goals vs actuals (hit/miss log).
 * Query params: months=12 (default)
 */
router.get('/goal-history', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const months = Math.min(24, Math.max(1, parseInt(req.query.months as string) || 12));

  if (!shopId) return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const now = new Date();
    const history: any[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

      const [billsRes, goalRes] = await Promise.all([
        supabaseServer
          .from('bills').select('total,total_profit,items')
          .eq('shop_id', shopId).eq('status', 'completed')
          .gte('date', `${month}-01T00:00:00.000Z`)
          .lte('date', `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`),
        supabaseServer.from('goals').select('*').eq('shop_id', shopId).eq('month', month).maybeSingle(),
      ]);

      const bills = billsRes.data || [];
      const goal = goalRes.data;
      const actualProfit = bills.reduce((s: number, b: any) => s + Number(b.total_profit || 0), 0);
      const actualSales = bills.reduce((s: number, b: any) => s + Number(b.total || 0), 0);
      const piecesSold = bills.reduce((s: number, b: any) =>
        s + (b.items || []).reduce((ss: number, it: any) => ss + (it.quantity || 0), 0), 0);
      const target = goal ? Number(goal.profit_target) : null;

      history.push({
        month,
        actualProfit,
        actualSales,
        piecesSold,
        target,
        hit: target !== null ? actualProfit >= target : null,
        achievedPercent: target && target > 0 ? Math.round((actualProfit / target) * 100) : null,
        gap: target !== null ? actualProfit - target : null,
      });
    }

    res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('[Reports/goal-history]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

