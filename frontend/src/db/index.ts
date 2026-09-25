import Dexie, { type Table } from 'dexie';
import type {
  Shop,
  Product,
  StockMovement,
  Bill,
  Customer,
  Goal,
  AdminConfig,
  MonthEndSummary,
} from '../types';

export class TelaDB extends Dexie {
  shops!: Table<Shop, string>;
  products!: Table<Product, string>;
  stockMovements!: Table<StockMovement, string>;
  bills!: Table<Bill, string>;
  customers!: Table<Customer, string>;
  goals!: Table<Goal, string>;
  adminConfig!: Table<AdminConfig, string>;

  constructor() {
    super('TelaDB');
    this.version(1).stores({
      shops: 'id, phone, email',
      products: 'id, shopId, code, category, quantity, archived, createdAt',
      stockMovements: 'id, shopId, productId, type, date',
      bills: 'id, shopId, billNo, date, customerPhone, status',
      customers: 'id, shopId, phone',
      goals: 'id, shopId, month',
      adminConfig: 'id',
    });
  }
}

export const db = new TelaDB();

// Database Initialization & Cleanup
export async function clearAllDatabase() {
  await db.products.clear();
  await db.bills.clear();
  await db.stockMovements.clear();
  await db.customers.clear();
  await db.goals.clear();
  await db.shops.clear();
  localStorage.removeItem('tela_session');
  localStorage.removeItem('tela_action_count');
  localStorage.removeItem('tela_licensed');
}

export async function initializeDatabase() {
  // If demo data was previously loaded with 'shop_lakshmi_001', clean it up once
  const demoShop = await db.shops.get('shop_lakshmi_001');
  if (demoShop) {
    await clearAllDatabase();
  }

  // Ensure Admin Config exists
  const config = await db.adminConfig.get('default_admin_config');
  if (!config) {
    await db.adminConfig.add({
      id: 'default_admin_config',
      globalSubscriptionEnabled: false, // Default to FALSE (100% free mode during launch)
      trialActionLimit: 25,
      whitelistedUsers: [],
      platformNotice: 'Welcome to Tela! Early Access Free Mode is active.',
    });
  }
}

// Subscription & Whitelist Access Control Service
export async function checkAccessPermission(
  identifier: string, // phone or email
  actionCount: number
): Promise<{
  canAccess: boolean;
  status: 'GLOBAL_FREE' | 'WHITELISTED' | 'TRIAL_ACTIVE' | 'PAYWALL_REQUIRED';
  reason: string;
  config: AdminConfig;
}> {
  let config = await db.adminConfig.toCollection().first();
  if (!config) {
    config = {
      id: 'default_admin_config',
      globalSubscriptionEnabled: false,
      trialActionLimit: 25,
      whitelistedUsers: [],
    };
    await db.adminConfig.add(config);
  }

  // 1. If Admin has disabled subscription globally -> 100% Free
  if (!config.globalSubscriptionEnabled) {
    return {
      canAccess: true,
      status: 'GLOBAL_FREE',
      reason: 'Platform is currently free for all users (Subscription Disabled by Admin).',
      config,
    };
  }

  // 2. If user identifier is on Whitelist -> 100% Free Bypass
  const cleanId = identifier.trim().toLowerCase();
  const isWhitelisted = config.whitelistedUsers.some(
    (u) => u.identifier.trim().toLowerCase() === cleanId
  );

  if (isWhitelisted) {
    return {
      canAccess: true,
      status: 'WHITELISTED',
      reason: 'Whitelisted / VIP Account (Family / Direct Access Granted by Admin).',
      config,
    };
  }

  // 3. Check trial actions count (e.g. user has done < 25 actions/bills/items)
  if (actionCount < config.trialActionLimit) {
    return {
      canAccess: true,
      status: 'TRIAL_ACTIVE',
      reason: `Trial Active: ${actionCount} of ${config.trialActionLimit} free actions used.`,
      config,
    };
  }

  // 4. Trial expired and not whitelisted -> Paywall
  return {
    canAccess: false,
    status: 'PAYWALL_REQUIRED',
    reason: `You have completed ${actionCount} actions. Lifetime license required (₹499).`,
    config,
  };
}

// Helper: Calculate Summary & Insights
export async function calculateMonthEndSummary(shopId: string, month: string): Promise<MonthEndSummary> {
  const products = await db.products.where('shopId').equals(shopId).and((p) => !p.archived).toArray();
  const bills = await db.bills
    .where('shopId')
    .equals(shopId)
    .filter((b) => b.status === 'completed' && b.date.startsWith(month))
    .toArray();

  const goal = await db.goals.where({ shopId, month }).first();

  let totalSales = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let piecesSold = 0;
  let discountGiven = 0;
  let lossMakingSalesCount = 0;
  let lossMakingTotalAmount = 0;

  for (const bill of bills) {
    totalSales += bill.total;
    totalCost += bill.totalCost;
    totalProfit += bill.totalProfit;
    discountGiven += bill.discount;

    for (const item of bill.items) {
      piecesSold += item.quantity;
      const itemDiscount = (item.listedPrice - item.soldPrice) * item.quantity;
      if (itemDiscount > 0) {
        discountGiven += itemDiscount;
      }
      if (item.profit < 0) {
        lossMakingSalesCount++;
        lossMakingTotalAmount += Math.abs(item.profit);
      }
    }
  }

  const closingStockPieces = products.reduce((acc, p) => acc + p.quantity, 0);
  const goalTarget = goal ? goal.profitTarget : 50000;
  const goalAchievedPercent = goalTarget > 0 ? Math.round((totalProfit / goalTarget) * 100) : 0;
  const shortByAmount = Math.max(0, goalTarget - totalProfit);

  // Restock alerts: items with quantity <= alertLevel
  const restockSuggestions = products
    .filter((p) => p.quantity <= p.alertLevel)
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      quantity: p.quantity,
      alertLevel: p.alertLevel,
      unitsSoldLast30Days: 0,
      dailyVelocity: 0,
      daysLeft: Math.max(1, Math.round(p.quantity * 2.5)),
    }));

  // Dead stock: items with 0 sales or created > 60 days ago
  const deadStock = products
    .filter((p) => {
      const daysOld = (Date.now() - new Date(p.createdAt).getTime()) / 86400000;
      return daysOld >= 60 && p.quantity > 0;
    })
    .map((p) => {
      const daysSinceLastSale = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000);
      let agingBucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
      if (daysSinceLastSale > 90) agingBucket = '90+';
      else if (daysSinceLastSale > 60) agingBucket = '61-90';
      else if (daysSinceLastSale > 30) agingBucket = '31-60';

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category,
        quantity: p.quantity,
        costPrice: p.costPrice,
        capitalLocked: p.quantity * p.costPrice,
        lastSoldDate: null,
        daysSinceLastSale,
        agingBucket,
      };
    });

  const deadStockAgingBuckets = {
    '0-30': deadStock.filter((d) => d.agingBucket === '0-30').length,
    '31-60': deadStock.filter((d) => d.agingBucket === '31-60').length,
    '61-90': deadStock.filter((d) => d.agingBucket === '61-90').length,
    '90+': deadStock.filter((d) => d.agingBucket === '90+').length,
  };

  return {
    month,
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
