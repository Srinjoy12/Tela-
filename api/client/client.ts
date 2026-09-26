import type {
  Shop, Product, Bill, Customer, CustomerTransaction,
  Goal, AdminConfig, MonthEndSummary,
  PaginatedResponse, DateRangeReport, MonthComparison,
  Supplier, PurchaseOrder, GoalHistoryItem,
} from '../types';
import { getSupabaseSession } from '../../frontend/src/utils/supabase';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL : '/api';

async function requestRaw(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  let token = '';
  try {
    const { session } = await getSupabaseSession();
    if (session?.access_token) token = session.access_token;
  } catch { /* ignore */ }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `API Request Failed: ${response.statusText}`);
  }
  return json;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const json = await requestRaw(endpoint, options);
  return json.data as T;
}

async function requestPaged<T>(endpoint: string, options: RequestInit = {}): Promise<PaginatedResponse<T>> {
  const json = await requestRaw(endpoint, options);
  return {
    data: json.data as T[],
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 50,
    totalPages: json.totalPages ?? 1,
  };
}

export const api = {
  shops: {
    getAll: () => request<Shop[]>('/auth/all-shops'),
    getByUserId: (userId: string) => request<Shop[]>(`/auth/shops?userId=${userId}`),
    create: (data: Omit<Shop, 'id' | 'createdAt'>) =>
      request<Shop>('/auth/shops', { method: 'POST', body: JSON.stringify(data) }),
  },

  products: {
    getByShop: (
      shopId: string,
      opts?: { page?: number; limit?: number; search?: string; category?: string }
    ) => {
      const p = new URLSearchParams({ shopId });
      if (opts?.page) p.set('page', String(opts.page));
      if (opts?.limit) p.set('limit', String(opts.limit));
      if (opts?.search) p.set('search', opts.search);
      if (opts?.category) p.set('category', opts.category);
      return requestPaged<Product>(`/products?${p.toString()}`);
    },
    create: (product: Partial<Product>) =>
      request<Product>('/products', { method: 'POST', body: JSON.stringify(product) }),
    update: (id: string, updates: Partial<Product>) =>
      request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) =>
      request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
    adjustStock: (id: string, quantityChange: number, reason: string, type: string) =>
      request<Product>(`/products/${id}/adjust`, {
        method: 'POST', body: JSON.stringify({ quantityChange, reason, type }),
      }),
    uploadPhoto: (id: string, photo: string) =>
      request<Product>(`/products/${id}/photo`, {
        method: 'POST', body: JSON.stringify({ photo }),
      }),
    bulkImport: (shopId: string, products: Product[], duplicateStrategy: string) =>
      request<{ added: number; updated: number; skipped: number }>('/products/bulk', {
        method: 'POST', body: JSON.stringify({ shopId, products, duplicateStrategy }),
      }),
  },

  suppliers: {
    getAll: (shopId: string) => request<Supplier[]>(`/suppliers?shopId=${shopId}`),
    create: (supplier: Partial<Supplier>) =>
      request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(supplier) }),
    update: (id: string, updates: Partial<Supplier>) =>
      request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) =>
      request<{ message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
    getPurchases: (id: string) =>
      request<PurchaseOrder[]>(`/suppliers/${id}/purchases`),
  },

  purchases: {
    getAll: (
      shopId: string,
      opts?: { page?: number; limit?: number; supplierId?: string; productId?: string }
    ) => {
      const p = new URLSearchParams({ shopId });
      if (opts?.page) p.set('page', String(opts.page));
      if (opts?.limit) p.set('limit', String(opts.limit));
      if (opts?.supplierId) p.set('supplierId', opts.supplierId);
      if (opts?.productId) p.set('productId', opts.productId);
      return requestPaged<PurchaseOrder>(`/purchases?${p.toString()}`);
    },
    create: (po: Partial<PurchaseOrder>) =>
      request<PurchaseOrder>('/purchases', { method: 'POST', body: JSON.stringify(po) }),
    recordPayment: (id: string, amount: number, notes?: string) =>
      request<PurchaseOrder>(`/purchases/${id}/pay`, {
        method: 'POST', body: JSON.stringify({ amount, notes }),
      }),
  },

  bills: {
    getByShop: (
      shopId: string,
      opts?: { page?: number; limit?: number; month?: string; from?: string; to?: string; status?: string }
    ) => {
      const p = new URLSearchParams({ shopId });
      if (opts?.page) p.set('page', String(opts.page));
      if (opts?.limit) p.set('limit', String(opts.limit));
      if (opts?.month) p.set('month', opts.month);
      if (opts?.from) p.set('from', opts.from);
      if (opts?.to) p.set('to', opts.to);
      if (opts?.status) p.set('status', opts.status);
      return requestPaged<Bill>(`/bills?${p.toString()}`);
    },
    create: (billData: Omit<Bill, 'id' | 'billNo' | 'createdAt'>) =>
      request<Bill>('/bills', { method: 'POST', body: JSON.stringify(billData) }),
    cancel: (id: string) =>
      request<{ message: string; data: Bill }>(`/bills/${id}/cancel`, { method: 'POST' }),
  },

  customers: {
    getByShop: (
      shopId: string,
      opts?: { page?: number; limit?: number; search?: string }
    ) => {
      const p = new URLSearchParams({ shopId });
      if (opts?.page) p.set('page', String(opts.page));
      if (opts?.limit) p.set('limit', String(opts.limit));
      if (opts?.search) p.set('search', opts.search);
      return requestPaged<Customer>(`/customers?${p.toString()}`);
    },
    getAll: (shopId: string) => request<Customer[]>(`/customers?shopId=${shopId}&limit=500`),
    create: (customer: Omit<Customer, 'id' | 'totalSpent'>) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(customer) }),
    recordPayment: (id: string, amount: number, notes?: string) =>
      request<Customer>(`/customers/${id}/payment`, { method: 'POST', body: JSON.stringify({ amount, notes }) }),
    addCredit: (id: string, amount: number, notes?: string) =>
      request<Customer>(`/customers/${id}/credit`, { method: 'POST', body: JSON.stringify({ amount, notes }) }),
    getTransactions: (id: string) =>
      request<CustomerTransaction[]>(`/customers/${id}/transactions`),
  },

  goals: {
    get: (shopId: string, month: string) => request<Goal | null>(`/goals?shopId=${shopId}&month=${month}`),
    update: (goal: Partial<Goal>) =>
      request<Goal>('/goals', { method: 'POST', body: JSON.stringify(goal) }),
  },

  reports: {
    getMonthly: (shopId: string, month: string) =>
      request<MonthEndSummary>(`/reports/monthly?shopId=${shopId}&month=${month}`),
    getRange: (shopId: string, from: string, to: string) =>
      request<DateRangeReport>(`/reports/range?shopId=${shopId}&from=${from}&to=${to}`),
    compare: (shopId: string, month: string) =>
      request<MonthComparison>(`/reports/compare?shopId=${shopId}&month=${month}`),
    getGoalHistory: (shopId: string, months = 12) =>
      request<GoalHistoryItem[]>(`/reports/goal-history?shopId=${shopId}&months=${months}`),
  },

  historical: {
    getStats: (shopId: string) =>
      request<{ totalInvested: number; totalSales: number; totalProfit: number; totalPieces: number }>(`/historical/stats?shopId=${shopId}`),
    upload: (shopId: string, rows: any[]) =>
      request<{ recordsProcessed: number }>('/historical/upload', {
        method: 'POST',
        body: JSON.stringify({ shopId, rows }),
      }),
  },

  admin: {
    getConfig: () => request<AdminConfig>('/admin/config'),
    updateConfig: (updates: Partial<AdminConfig>) =>
      request<AdminConfig>('/admin/config', { method: 'POST', body: JSON.stringify(updates) }),
    addWhitelist: (identifier: string, name?: string, notes?: string) =>
      request<AdminConfig['whitelistedUsers']>('/admin/whitelist', {
        method: 'POST', body: JSON.stringify({ identifier, name, notes }),
      }),
    removeWhitelist: (id: string) =>
      request<AdminConfig['whitelistedUsers']>(`/admin/whitelist/${id}`, { method: 'DELETE' }),
    getFleet: () =>
      request<{ totalShops: number; totalProducts: number; totalBills: number; totalGrossVolume: number; shops: Shop[] }>('/admin/fleet'),
    clearAll: () =>
      request<{ message: string }>('/admin/clear-all', { method: 'POST' }),
  },
};
