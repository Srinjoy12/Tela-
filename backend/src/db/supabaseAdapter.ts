import { supabaseServer, isSupabaseConfigured } from '../../../api/supabase';
import type { DatabaseData } from './index';

/**
 * Syncs database records from live Supabase Cloud into server memory
 */
export async function syncFromSupabase(): Promise<DatabaseData | null> {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return null;
  }

  try {
    const [
      shopsRes,
      productsRes,
      movementsRes,
      billsRes,
      customersRes,
      goalsRes,
      adminRes,
    ] = await Promise.all([
      supabaseServer.from('shops').select('*'),
      supabaseServer.from('products').select('*'),
      supabaseServer.from('stock_movements').select('*'),
      supabaseServer.from('bills').select('*'),
      supabaseServer.from('customers').select('*'),
      supabaseServer.from('goals').select('*'),
      supabaseServer.from('admin_config').select('*').limit(1),
    ]);

    if (shopsRes.error) console.error('[Supabase Sync] Shops error:', shopsRes.error);
    if (productsRes.error) console.error('[Supabase Sync] Products error:', productsRes.error);

    const remoteData: DatabaseData = {
      shops: (shopsRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        ownerName: s.owner_name,
        phone: s.phone,
        email: s.email,
        businessType: s.business_type,
        language: s.language,
        pin: s.pin,
        address: s.address,
        createdAt: s.created_at,
      })),
      products: (productsRes.data || []).map((p: any) => ({
        id: p.id,
        shopId: p.shop_id,
        code: p.code,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        costPrice: Number(p.cost_price),
        sellingPrice: Number(p.selling_price),
        alertLevel: p.alert_level,
        supplier: p.supplier,
        colorNotes: p.color_notes,
        archived: p.archived,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      stockMovements: (movementsRes.data || []).map((m: any) => ({
        id: m.id,
        shopId: m.shop_id,
        productId: m.product_id,
        productName: m.product_name,
        type: m.type,
        quantityChange: m.quantity_change,
        previousQuantity: m.previous_quantity,
        newQuantity: m.new_quantity,
        reason: m.reason,
        date: m.date,
      })),
      bills: (billsRes.data || []).map((b: any) => ({
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
        status: b.status,
        createdAt: b.created_at,
        createdBy: b.created_by,
      })),
      customers: (customersRes.data || []).map((c: any) => ({
        id: c.id,
        shopId: c.shop_id,
        name: c.name,
        phone: c.phone,
        balanceDue: Number(c.balance_due),
        totalSpent: Number(c.total_spent),
        lastPurchaseDate: c.last_purchase_date,
      })),
      goals: (goalsRes.data || []).map((g: any) => ({
        id: g.id,
        shopId: g.shop_id,
        month: g.month,
        profitTarget: Number(g.profit_target),
        salesTarget: Number(g.sales_target),
        piecesTarget: Number(g.pieces_target),
      })),
      adminConfig: adminRes.data && adminRes.data[0]
        ? {
            id: adminRes.data[0].id,
            globalSubscriptionEnabled: adminRes.data[0].global_subscription_enabled,
            trialActionLimit: adminRes.data[0].trial_action_limit,
            whitelistedUsers: adminRes.data[0].whitelisted_users || [],
            platformNotice: adminRes.data[0].platform_notice,
          }
        : {
            id: 'global_config',
            globalSubscriptionEnabled: false,
            trialActionLimit: 25,
            whitelistedUsers: [],
            platformNotice: 'Welcome to Tela!',
          },
    };

    console.log(
      `[Supabase Sync] Successfully loaded ${remoteData.shops.length} shops, ${remoteData.products.length} products from Supabase.`
    );
    return remoteData;
  } catch (err) {
    console.error('[Supabase Sync] Failed to sync from Supabase, continuing with local store:', err);
    return null;
  }
}

/**
 * Pushes updated records to Supabase Cloud
 */
export async function pushToSupabase(data: DatabaseData): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseServer) {
    return;
  }

  try {
    // Upsert admin config
    await supabaseServer.from('admin_config').upsert({
      id: data.adminConfig.id || 'global_config',
      global_subscription_enabled: data.adminConfig.globalSubscriptionEnabled,
      trial_action_limit: data.adminConfig.trialActionLimit,
      whitelisted_users: data.adminConfig.whitelistedUsers,
      platform_notice: data.adminConfig.platformNotice,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Supabase Sync] Background push error:', err);
  }
}
