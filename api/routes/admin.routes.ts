import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';

const router = Router();

/**
 * GET /api/admin/config
 * Fetch global admin configuration from Supabase.
 */
router.get('/config', async (_req, res) => {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('admin_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Seed default admin config if none exists
      const defaultConfig = {
        id: 'global_config',
        global_subscription_enabled: false,
        trial_action_limit: 25,
        whitelisted_users: [],
        platform_notice: 'Welcome to Tela! Early Access Free Mode is active.',
        updated_at: new Date().toISOString(),
      };

      await supabaseServer.from('admin_config').insert(defaultConfig);
      return res.json({ success: true, data: mapAdminConfig(defaultConfig) });
    }

    res.json({ success: true, data: mapAdminConfig(data) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/config
 * Update global admin config (subscription switch, trial limit, notice).
 */
router.post('/config', async (req, res) => {
  const { globalSubscriptionEnabled, trialActionLimit, platformNotice } = req.body;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (globalSubscriptionEnabled !== undefined) {
      updatePayload.global_subscription_enabled = Boolean(globalSubscriptionEnabled);
    }
    if (trialActionLimit !== undefined) {
      updatePayload.trial_action_limit = Number(trialActionLimit) || 25;
    }
    if (platformNotice !== undefined) {
      updatePayload.platform_notice = platformNotice;
    }

    const { data, error } = await supabaseServer
      .from('admin_config')
      .update(updatePayload)
      .eq('id', 'global_config')
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: mapAdminConfig(data) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/whitelist
 * Add a user to the VIP/family whitelist.
 */
router.post('/whitelist', async (req, res) => {
  const { identifier, name, notes } = req.body;

  if (!identifier) {
    return res.status(400).json({ success: false, error: 'identifier (phone or email) is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    // Fetch current config
    const { data: config, error: fetchError } = await supabaseServer
      .from('admin_config')
      .select('*')
      .eq('id', 'global_config')
      .single();

    if (fetchError || !config) throw fetchError || new Error('Admin config not found');

    const currentList = config.whitelisted_users || [];
    const newUser = {
      id: `wl_${Date.now()}`,
      identifier: identifier.trim(),
      name: name ? name.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      addedAt: new Date().toISOString(),
    };
    const updatedList = [...currentList, newUser];

    const { error: updateError } = await supabaseServer
      .from('admin_config')
      .update({ whitelisted_users: updatedList, updated_at: new Date().toISOString() })
      .eq('id', 'global_config');

    if (updateError) throw updateError;

    res.status(201).json({ success: true, data: updatedList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/whitelist/:id
 * Remove a user from the whitelist.
 */
router.delete('/whitelist/:id', async (req, res) => {
  const { id } = req.params;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    const { data: config, error: fetchError } = await supabaseServer
      .from('admin_config')
      .select('*')
      .eq('id', 'global_config')
      .single();

    if (fetchError || !config) throw fetchError || new Error('Admin config not found');

    const updatedList = (config.whitelisted_users || []).filter((u: any) => u.id !== id);

    await supabaseServer
      .from('admin_config')
      .update({ whitelisted_users: updatedList, updated_at: new Date().toISOString() })
      .eq('id', 'global_config');

    res.json({ success: true, data: updatedList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/fleet
 * Fleet monitoring: stats across all shops.
 */
router.get('/fleet', async (_req, res) => {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    const [shopsRes, productsRes, billsRes] = await Promise.all([
      supabaseServer.from('shops').select('*'),
      supabaseServer.from('products').select('*').eq('archived', false),
      supabaseServer.from('bills').select('*'),
    ]);

    const shops = (shopsRes.data || []).map((s: any) => ({
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

    const totalProducts = (productsRes.data || []).length;
    const totalBills = (billsRes.data || []).length;
    const totalGrossVolume = (billsRes.data || []).reduce((acc: number, b: any) => acc + (Number(b.total) || 0), 0);

    res.json({
      success: true,
      data: {
        totalShops: shops.length,
        totalProducts,
        totalBills,
        totalGrossVolume,
        shops,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/clear-all
 * Clear all data from all Supabase tables (DANGER).
 */
router.post('/clear-all', async (_req, res) => {
  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Database wipe is disabled in this environment. Set ALLOW_DATABASE_RESET=true in server configuration to enable.',
    });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
  }

  try {
    // Delete in dependency order
    await supabaseServer.from('stock_movements').delete().neq('id', '');
    await supabaseServer.from('bills').delete().neq('id', '');
    await supabaseServer.from('customers').delete().neq('id', '');
    await supabaseServer.from('goals').delete().neq('id', '');
    await supabaseServer.from('products').delete().neq('id', '');
    await supabaseServer.from('shops').delete().neq('id', '');

    // Reset admin config
    await supabaseServer
      .from('admin_config')
      .upsert({
        id: 'global_config',
        global_subscription_enabled: false,
        trial_action_limit: 25,
        whitelisted_users: [],
        platform_notice: 'Welcome to Tela! Early Access Free Mode is active.',
        updated_at: new Date().toISOString(),
      });

    res.json({ success: true, message: 'All database records successfully cleared from Supabase.' });
  } catch (err: any) {
    console.error('[Admin Clear] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: map admin config from snake_case
function mapAdminConfig(row: any) {
  return {
    id: row.id,
    globalSubscriptionEnabled: row.global_subscription_enabled,
    trialActionLimit: row.trial_action_limit,
    whitelistedUsers: row.whitelisted_users || [],
    platformNotice: row.platform_notice,
  };
}

export default router;
