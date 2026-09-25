// Domain & API Contract Types for Tela

export type BusinessType = 'Saree' | 'Garments' | 'General' | 'Electronics' | 'Hardware' | 'Grocery' | 'Jewellery' | 'Footwear' | 'Furniture' | 'Pharmacy' | 'Other';

export type UserRole = 'owner' | 'staff' | 'admin';

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Part';

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email?: string;
  businessType: BusinessType;
  language: string;
  pin?: string;
  address?: string;
  createdAt: string;
}

export interface Product {
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
  supplierId?: string;
  colorNotes?: string;
  photo?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
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
}

export interface BillItem {
  id: string;
  billId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  listedPrice: number;
  soldPrice: number;
  costPriceAtSale: number;
  profit: number; // (soldPrice - costPriceAtSale) * quantity
}

export interface Bill {
  id: string;
  shopId: string;
  billNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  totalProfit: number;
  paymentMode: PaymentMode;
  amountPaid?: number;
  balanceDue?: number;
  status: 'completed' | 'cancelled' | 'returned';
  createdAt: string;
  createdBy: UserRole;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  balanceDue: number;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export interface CustomerTransaction {
  id: string;
  shopId: string;
  customerId: string;
  billId?: string;
  type: 'credit_sale' | 'payment' | 'adjustment' | 'return_credit';
  amount: number;
  balanceAfter: number;
  notes?: string;
  date: string;
}

export interface Goal {
  id: string;
  shopId: string;
  month: string; // YYYY-MM
  profitTarget: number;
  salesTarget?: number;
  piecesTarget?: number;
}

export interface WhitelistedUser {
  id: string;
  identifier: string; // phone or email
  name?: string;
  notes?: string;
  addedAt: string;
}

export interface AdminConfig {
  id: string;
  globalSubscriptionEnabled: boolean; // Master toggle to turn subscription ON/OFF globally
  trialActionLimit: number; // default 25 free actions/items/bills before paywall
  whitelistedUsers: WhitelistedUser[]; // Family / VIP users who bypass paywall forever
  platformNotice?: string;
}

export interface UserSession {
  shopId: string;
  phone: string;
  email?: string;
  role: UserRole;
  isWhitelisted: boolean;
  actionCount: number;
}

export interface DeadStockItem {
  id: string;
  name: string;
  code: string;
  category: string;
  quantity: number;
  costPrice?: number;
  capitalLocked: number;
  lastSoldDate: string | null;
  daysSinceLastSale: number;
  agingBucket: '0-30' | '31-60' | '61-90' | '90+';
}

export interface RestockSuggestion {
  id: string;
  name: string;
  code: string;
  category: string;
  quantity: number;
  alertLevel: number;
  unitsSoldLast30Days: number;
  dailyVelocity: number;
  daysLeft: number;
}

export interface MonthEndSummary {
  month: string;
  openingStockPieces: number;
  restockedPieces: number;
  soldPieces: number;
  closingStockPieces: number;
  totalSales: number;
  cogs: number;
  totalProfit: number; // Gross Counter Profit
  discountGiven: number;
  discountAvgPercent: number;
  goalTarget: number;
  goalAchievedPercent: number;
  shortByAmount: number;
  restockSuggestions: RestockSuggestion[];
  deadStock: DeadStockItem[];
  deadStockAgingBuckets: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
  lossMakingSalesCount: number;
  lossMakingTotalAmount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DateRangeReport extends MonthEndSummary {
  from: string;
  to: string;
}

export interface MonthComparison {
  current: MonthEndSummary;
  previous: MonthEndSummary;
  salesChange: number;        // percentage
  profitChange: number;       // percentage
  piecesSoldChange: number;   // percentage
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  createdAt: string;
  totalPurchases?: number;
  totalPaid?: number;
  balanceDue?: number;
}

export interface PurchaseOrder {
  id: string;
  shopId: string;
  supplierId?: string;
  supplierName: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface GoalHistoryItem {
  month: string;
  actualProfit: number;
  actualSales: number;
  piecesSold: number;
  target: number | null;
  hit: boolean | null;
  achievedPercent: number | null;
  gap: number | null;
}

