import fs from 'fs';
import path from 'path';

export interface DatabaseData {
  shops: Array<{
    id: string;
    name: string;
    ownerName: string;
    phone: string;
    email?: string;
    businessType: string;
    language: string;
    pin?: string;
    address?: string;
    createdAt: string;
  }>;
  products: Array<{
    id: string;
    shopId: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    alertLevel: number;
    supplier?: string;
    colorNotes?: string;
    archived?: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  stockMovements: Array<{
    id: string;
    shopId: string;
    productId: string;
    productName: string;
    type: 'purchase' | 'sale' | 'adjustment' | 'return';
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    date: string;
  }>;
  bills: Array<{
    id: string;
    shopId: string;
    billNo: string;
    date: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      id: string;
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      listedPrice: number;
      soldPrice: number;
      costPriceAtSale: number;
      profit: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    totalCost: number;
    totalProfit: number;
    paymentMode: string;
    status: 'completed' | 'cancelled' | 'returned';
    createdAt: string;
    createdBy: string;
  }>;
  customers: Array<{
    id: string;
    shopId: string;
    name: string;
    phone: string;
    balanceDue: number;
    totalSpent: number;
    lastPurchaseDate?: string;
  }>;
  goals: Array<{
    id: string;
    shopId: string;
    month: string;
    profitTarget: number;
    salesTarget?: number;
    piecesTarget?: number;
  }>;
  adminConfig: {
    id: string;
    globalSubscriptionEnabled: boolean;
    trialActionLimit: number;
    whitelistedUsers: Array<{
      id: string;
      identifier: string;
      name?: string;
      notes?: string;
      addedAt: string;
    }>;
    platformNotice?: string;
  };
}

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const DB_FILE = path.join(DATA_DIR, 'tela_db.json');

const INITIAL_DATA: DatabaseData = {
  shops: [],
  products: [],
  stockMovements: [],
  bills: [],
  customers: [],
  goals: [],
  adminConfig: {
    id: 'default_admin_config',
    globalSubscriptionEnabled: false, // Default: 100% Free Mode during launch
    trialActionLimit: 25,
    whitelistedUsers: [],
    platformNotice: 'Welcome to Tela! Early Access Free Mode is active.',
  },
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
}

import { syncFromSupabase, pushToSupabase } from './supabaseAdapter';

// In-Memory cache with atomic disk flushes
let inMemoryDb: DatabaseData = loadFromDisk();

// Auto-sync from Supabase Cloud on startup if configured
syncFromSupabase()
  .then((remoteData) => {
    if (remoteData) {
      inMemoryDb = remoteData;
      saveToDisk(inMemoryDb);
    }
  })
  .catch((err) => console.error('[Supabase Init Error]', err));

function loadFromDisk(): DatabaseData {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading DB file, resetting to clean schema:', err);
    return INITIAL_DATA;
  }
}

// Atomic file write using write-to-temp-then-rename to prevent corruption on crash
function saveToDisk(data: DatabaseData) {
  const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
}

// Mutex lock for atomic transactions
let lockPromise: Promise<void> = Promise.resolve();

export async function transaction<T>(callback: (db: DatabaseData) => T): Promise<T> {
  const nextLock = lockPromise.then(async () => {
    const result = callback(inMemoryDb);
    saveToDisk(inMemoryDb);
    pushToSupabase(inMemoryDb);
    return result;
  });
  lockPromise = nextLock.then(() => {}, () => {});
  return nextLock;
}

export function getDb(): DatabaseData {
  return inMemoryDb;
}

export async function clearDatabase(): Promise<void> {
  await transaction((db) => {
    db.shops = [];
    db.products = [];
    db.stockMovements = [];
    db.bills = [];
    db.customers = [];
    db.goals = [];
    db.adminConfig = {
      id: 'default_admin_config',
      globalSubscriptionEnabled: false,
      trialActionLimit: 25,
      whitelistedUsers: [],
      platformNotice: 'Welcome to Tela! Early Access Free Mode is active.',
    };
  });
}
