import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/goals
 * Fetch goal for the authenticated shop and target month.
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('shop_id', shopId)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;

    const goal = data ? mapGoal(data) : null;
    res.json({ success: true, data: goal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/goals
 * Create or update monthly profit and sales goals.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId!;
  const { month, profitTarget, salesTarget, piecesTarget } = req.body;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const targetMonth = month || new Date().toISOString().substring(0, 7);

  try {
    const { data: existing } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('shop_id', shopId)
      .eq('month', targetMonth)
      .maybeSingle();

    if (existing) {
      const updatePayload: any = {};
      updatePayload.profit_target = Number(profitTarget) || 50000;
      if (salesTarget !== undefined) updatePayload.sales_target = Number(salesTarget);
      if (piecesTarget !== undefined) updatePayload.pieces_target = Number(piecesTarget);

      const { data: updated, error } = await supabaseServer
        .from('goals')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('shop_id', shopId)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data: mapGoal(updated) });
    } else {
      const { data: created, error } = await supabaseServer
        .from('goals')
        .insert({
          id: `goal_${shopId}_${targetMonth}`,
          shop_id: shopId,
          month: targetMonth,
          profit_target: Number(profitTarget) || 50000,
          sales_target: Number(salesTarget) || 150000,
          pieces_target: Number(piecesTarget) || 50,
        })
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data: mapGoal(created) });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapGoal(g: any) {
  return {
    id: g.id,
    shopId: g.shop_id,
    month: g.month,
    profitTarget: Number(g.profit_target),
    salesTarget: Number(g.sales_target),
    piecesTarget: Number(g.pieces_target),
  };
}

export default router;
