import React, { useState, useEffect } from 'react';
import { api } from '../../api/client/client';
import { clearAllDatabase } from './db';
import type {
  Shop,
  Product,
  Bill,
  Customer,
  Goal,
  AdminConfig,
  UserRole,
  MonthEndSummary,
  Supplier,
} from './types';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductList } from './components/products/ProductList';
import { ProductModal } from './components/products/ProductModal';
import { StockAdjustModal } from './components/products/StockAdjustModal';
import { ExcelUploadModal } from './components/products/ExcelUploadModal';
import { BillingView } from './components/billing/BillingView';
import { GoalsView } from './components/goals/GoalsView';
import { ReportsView } from './components/reports/ReportsView';
import { CustomersView } from './components/customers/CustomersView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { HistoricalView } from './components/dashboard/HistoricalView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PaywallModal } from './components/subscription/PaywallModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { DotmSquare4 } from './components/ui/dotm-square-4';
import { DynamicLoadingText } from './components/ui/dynamic-loading-text';
import { onAuthStateChange, signOutUser, getSupabaseSession, isSupabaseClientConfigured } from './utils/supabase';

export const App: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [shop, setShop] = useState<Shop | null>(null);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthEndSummary | null>(null);

  // URL Route Detection for Super Admin (comes when we put admin URL, e.g. #admin or /admin)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return (
      window.location.hash === '#admin' ||
      window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('admin')
    );
  });

  useEffect(() => {
    const handleRouteCheck = () => {
      const onAdmin =
        window.location.hash === '#admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.search.includes('admin');
      setIsAdminRoute(onAdmin);
    };

    window.addEventListener('hashchange', handleRouteCheck);
    window.addEventListener('popstate', handleRouteCheck);
    return () => {
      window.removeEventListener('hashchange', handleRouteCheck);
      window.removeEventListener('popstate', handleRouteCheck);
    };
  }, []);

  // User & Access state
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [userIdentifier, setUserIdentifier] = useState<string>(() => {
    return localStorage.getItem('tela_user_id') || '9876543210';
  });
  const [actionCount, setActionCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('tela_action_count') || '0', 10);
  });
  const [isLifetimeLicensed, setIsLifetimeLicensed] = useState<boolean>(() => {
    return localStorage.getItem('tela_licensed') === 'true';
  });
  const [showPaywall, setShowPaywall] = useState(false);

  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);

  // 1. Initial Load & Seed (Backend API with Supabase Auth verification)
  const loadData = async (activeShopId?: string) => {
    let currentAuthUser: any = null;
    if (isSupabaseClientConfigured()) {
      try {
        const { user } = await getSupabaseSession();
        currentAuthUser = user;
      } catch (err) {
        console.warn('Supabase getSession error:', err);
      }
    }

    if (isSupabaseClientConfigured() && !currentAuthUser) {
      // User is not signed in to Supabase -> require Auth screen, avoid 401 calls
      localStorage.removeItem('tela_active_shop_id');
      setShop(null);
      setAllShops([]);
      setProducts([]);
      setBills([]);
      setCustomers([]);
      setCurrentGoal(null);
      setMonthSummary(null);
      setLoading(false);
      return;
    }

    let loadedShops: Shop[] = [];
    if (currentAuthUser) {
      try {
        loadedShops = await api.shops.getByUserId(currentAuthUser.id);
      } catch (err) {
        console.warn('Could not fetch user shops:', err);
      }
    } else {
      try {
        loadedShops = await api.shops.getAll();
      } catch (err) {
        console.warn('Could not fetch shops:', err);
      }
    }
    setAllShops(loadedShops);

    let targetShop: Shop | null = null;
    if (loadedShops.length > 0) {
      const savedShopId = activeShopId || localStorage.getItem('tela_active_shop_id');
      targetShop = loadedShops.find((s) => s.id === savedShopId) || loadedShops[0];
      if (targetShop) {
        localStorage.setItem('tela_active_shop_id', targetShop.id);
      }
    }

    setShop(targetShop);

    if (targetShop) {
      setUserIdentifier(targetShop.phone);
      let prods: Product[] = [];
      let loadedBills: Bill[] = [];
      let custs: Customer[] = [];
      let supps: Supplier[] = [];
      let goal: Goal | null = null;
      let summary: MonthEndSummary | null = null;

      const currentMonth = new Date().toISOString().substring(0, 7);

      try {
        const [pRes, bRes, cRes, g, s, sp] = await Promise.all([
          api.products.getByShop(targetShop.id, { limit: 1000 }),
          api.bills.getByShop(targetShop.id, { limit: 100 }),
          api.customers.getByShop(targetShop.id),
          api.goals.get(targetShop.id, currentMonth),
          api.reports.getMonthly(targetShop.id, currentMonth),
          api.suppliers.getAll(targetShop.id),
        ]);
        prods = pRes.data;
        loadedBills = bRes.data;
        custs = cRes.data;
        goal = g;
        summary = s;
        supps = sp;
      } catch (err) {
        console.error('Error fetching shop data from Supabase API:', err);
      }

      setProducts(prods);
      setSuppliers(supps);
      setBills(loadedBills);
      setCustomers(custs);
      setCurrentGoal(goal);
      setMonthSummary(summary);
    } else {
      setProducts([]);
      setSuppliers([]);
      setBills([]);
      setCustomers([]);
      setCurrentGoal(null);
      setMonthSummary(null);
    }

    try {
      const config = await api.admin.getConfig();
      setAdminConfig(config);
    } catch {
      // Non-admin users or unauthenticated endpoints will silently not load admin config
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Listen for Supabase auth state changes (login/logout from other tabs)
    const { data: { subscription } } = onAuthStateChange((session) => {
      if (!session) {
        // User signed out
        setShop(null);
        localStorage.removeItem('tela_active_shop_id');
      } else {
        loadData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Action Tracker & Paywall Interceptor
  const recordAction = async () => {
    const nextCount = actionCount + 1;
    setActionCount(nextCount);
    localStorage.setItem('tela_action_count', nextCount.toString());

    if (adminConfig && !isLifetimeLicensed) {
      if (!adminConfig.globalSubscriptionEnabled) return;
      const cleanId = (userIdentifier || '').trim().toLowerCase();
      const isWhitelisted = adminConfig.whitelistedUsers.some(
        (u) => u.identifier.trim().toLowerCase() === cleanId
      );
      if (isWhitelisted) return;
      if (nextCount >= adminConfig.trialActionLimit) {
        setShowPaywall(true);
      }
    }
  };

  // Auth Handlers
  const handleLoginSuccess = async (loggedInShop: Shop) => {
    localStorage.setItem('tela_active_shop_id', loggedInShop.id);
    localStorage.setItem('tela_user_id', loggedInShop.phone);
    setShop(loggedInShop);
    setUserIdentifier(loggedInShop.phone);
    await loadData(loggedInShop.id);
  };

  const handleCreateShop = async (shopData: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> => {
    const newShop = await api.shops.create(shopData);
    localStorage.setItem('tela_active_shop_id', newShop.id);
    localStorage.setItem('tela_user_id', newShop.phone);
    return newShop;
  };

  const handleLogout = async () => {
    await signOutUser();
    localStorage.removeItem('tela_active_shop_id');
    setShop(null);
  };

  const handleClearAll = async () => {
    try {
      await api.admin.clearAll();
    } catch (e) {
      console.warn('Backend clear failed:', e);
    }
    await clearAllDatabase();
    setShop(null);
    setProducts([]);
    setBills([]);
    setCustomers([]);
    setCurrentGoal(null);
    setMonthSummary(null);
    setActionCount(0);
    setIsLifetimeLicensed(false);
    await loadData();
  };

  // Product Handlers
  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (!shop) return;
    try {
      if (productToEdit) {
        await api.products.update(productToEdit.id, productData);
      } else {
        await api.products.create({ ...productData, shopId: shop.id });
      }
    } catch (err: any) {
      alert(`Error saving product: ${err.message || 'Unknown error'}`);
    }

    await recordAction();
    await loadData(shop.id);
    setProductToEdit(null);
  };

  const handleDuplicateProduct = async (product: Product) => {
    if (!shop) return;
    try {
      await api.products.create({
        ...product,
        code: `${product.code}-COPY`,
        name: `${product.name} (Copy)`,
        shopId: shop.id,
      });
    } catch (err: any) {
      alert(`Error duplicating product: ${err.message}`);
    }
    await recordAction();
    await loadData(shop.id);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!shop) return;
    try {
      await api.products.delete(productId);
    } catch (err: any) {
      alert(`Error deleting product: ${err.message}`);
    }
    await loadData(shop.id);
  };

  const handleAdjustStock = async (
    productId: string,
    quantityChange: number,
    reason: string,
    type: 'purchase' | 'adjustment' | 'return'
  ) => {
    if (!shop) return;
    try {
      await api.products.adjustStock(productId, quantityChange, reason, type);
    } catch (err: any) {
      alert(`Error adjusting stock: ${err.message}`);
    }
    await recordAction();
    await loadData(shop.id);
  };

  const handleExcelImport = async (
    importedProducts: Product[],
    duplicateStrategy: 'add' | 'overwrite' | 'skip'
  ) => {
    if (!shop) return { added: 0, updated: 0, skipped: 0 };
    try {
      const summary = await api.products.bulkImport(shop.id, importedProducts, duplicateStrategy);
      await recordAction();
      await loadData(shop.id);
      return summary;
    } catch (err: any) {
      console.error('Error importing products:', err);
      alert(`Error importing products: ${err.message || 'Please check network and try again.'}`);
      throw err;
    }
  };

  // Bill Creation Handler
  const handleSaveBill = async (
    billData: Omit<Bill, 'id' | 'billNo' | 'createdAt'>
  ): Promise<Bill> => {
    if (!shop) throw new Error('No active shop');
    const newBill = await api.bills.create(billData);
    await recordAction();
    await loadData(shop.id);
    return newBill;
  };

  // Goal Handler
  const handleUpdateGoal = async (
    profitTarget: number,
    salesTarget: number,
    piecesTarget: number
  ) => {
    if (!shop) return;
    const currentMonth = new Date().toISOString().substring(0, 7);
    await api.goals.update({
      shopId: shop.id,
      month: currentMonth,
      profitTarget,
      salesTarget,
      piecesTarget,
    });
    await loadData(shop.id);
  };

  // Customer Handlers
  const handleAddCustomer = async (custData: Omit<Customer, 'id' | 'totalSpent'>) => {
    if (!shop) return;
    await api.customers.create(custData);
    await loadData(shop.id);
  };

  const handleRecordPayment = async (customerId: string, paymentAmount: number) => {
    await api.customers.recordPayment(customerId, paymentAmount);
    if (shop) await loadData(shop.id);
  };

  const handleAddCredit = async (customerId: string, creditAmount: number) => {
    await api.customers.addCredit(customerId, creditAmount);
    if (shop) await loadData(shop.id);
  };

  // Admin Config Handlers
  const handleUpdateAdminConfig = async (updated: Partial<AdminConfig>) => {
    const config = await api.admin.updateConfig(updated);
    setAdminConfig(config);
  };

  const handleAddWhitelistedUser = async (identifier: string, name: string, notes: string) => {
    const updatedList = await api.admin.addWhitelist(identifier, name, notes);
    if (adminConfig) setAdminConfig({ ...adminConfig, whitelistedUsers: updatedList });
  };

  const handleRemoveWhitelistedUser = async (id: string) => {
    const updatedList = await api.admin.removeWhitelist(id);
    if (adminConfig) setAdminConfig({ ...adminConfig, whitelistedUsers: updatedList });
  };

  // Subscription Status Calculation
  // const isWhitelisted = adminConfig?.whitelistedUsers.some(
  //   (w) => w.identifier === userIdentifier
  // );


  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', background: '#FFF' }}>
        <div className="flex flex-col items-center gap-4">
          <DotmSquare4 size={48} dotSize={6} speed={1.35} />
          <div className="mono font-bold" style={{ fontSize: '1.25rem' }}>
            <DynamicLoadingText />
          </div>
        </div>
      </div>
    );
  }

  // 1. ADMIN URL ROUTE HANDLER (comes when URL has #admin or /admin)
  if (isAdminRoute && adminConfig) {
    return (
      <div className="min-h-screen bg-white px-3 py-4 sm:px-6 sm:py-6">
        <AdminDashboard
          adminConfig={adminConfig}
          allShops={allShops}
          allProducts={products}
          allBills={bills}
          onUpdateAdminConfig={handleUpdateAdminConfig}
          onAddWhitelistedUser={handleAddWhitelistedUser}
          onRemoveWhitelistedUser={handleRemoveWhitelistedUser}
          onClearAllDatabase={handleClearAll}
          onExitToShop={() => {
            window.location.hash = '';
            setIsAdminRoute(false);
          }}
        />
      </div>
    );
  }

  // 2. AUTH / ONBOARDING SCREEN (if no active shop logged in)
  if (!shop) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onCreateShop={handleCreateShop}
      />
    );
  }

  // 3. MAIN SHOP APPLICATION
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFF' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shop={shop}
        userRole={userRole}
        setUserRole={setUserRole}
        userIdentifier={userIdentifier}
        setUserIdentifier={setUserIdentifier}

        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            products={products}
            bills={bills}
            currentGoal={currentGoal}
            userRole={userRole}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setIsAddProductOpen(true);
            }}
            onOpenExcelUpload={() => setIsExcelUploadOpen(true)}
          />
        )}

        {activeTab === 'PRODUCTS' && (
          <ProductList
            products={products}
            userRole={userRole}
            shopName={shop.name}
            shopId={shop.id}
            onAddProduct={() => {
              setProductToEdit(null);
              setIsAddProductOpen(true);
            }}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setIsAddProductOpen(true);
            }}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={(p) => setProductToAdjust(p)}
            onOpenExcelUpload={() => setIsExcelUploadOpen(true)}
          />
        )}

        {activeTab === 'SUPPLIERS' && (
          <SuppliersView
            suppliers={suppliers}
            products={products}
            shopId={shop.id}
            onRefreshData={async () => {
              await loadData(shop.id);
            }}
          />
        )}

        {activeTab === 'BILLING' && (
          <BillingView
            products={products}
            userRole={userRole}
            shopId={shop.id}
            shopName={shop.name}
            onSaveBill={handleSaveBill}
          />
        )}

        {activeTab === 'GOALS' && (
          <GoalsView
            currentGoal={currentGoal}
            products={products}
            bills={bills}
            shopId={shop.id}
            onUpdateGoal={handleUpdateGoal}
          />
        )}

        {activeTab === 'REPORTS' && monthSummary && (
          <ReportsView
            summary={monthSummary}
            bills={bills}
            products={products}
            shopName={shop.name}
            shopId={shop.id}
            />
        )}

        {activeTab === 'CUSTOMERS' && (
          <CustomersView
            customers={customers}
            shopName={shop.name}
            shopId={shop.id}
            onAddCustomer={handleAddCustomer}
            onRecordPayment={handleRecordPayment}
            onAddCredit={handleAddCredit}
          />
        )}

        {activeTab === 'HISTORICAL' && (
          <HistoricalView shopId={shop.id} />
        )}
      </main>



      {/* MODALS */}
      {isAddProductOpen && (
        <ProductModal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          onSave={handleSaveProduct}
          productToEdit={productToEdit}
          shopId={shop.id}
          suppliers={suppliers}
        />
      )}

      {productToAdjust && (
        <StockAdjustModal
          isOpen={true}
          onClose={() => setProductToAdjust(null)}
          product={productToAdjust}
          onAdjust={handleAdjustStock}
        />
      )}

      {isExcelUploadOpen && (
        <ExcelUploadModal
          isOpen={isExcelUploadOpen}
          onClose={() => setIsExcelUploadOpen(false)}
          shopId={shop.id}
          onImportSuccess={handleExcelImport}
        />
      )}

      {showPaywall && (
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          actionCount={actionCount}
          onActivateLifetime={() => {
            setIsLifetimeLicensed(true);
            localStorage.setItem('tela_licensed', 'true');
          }}
          onApplyFamilyCode={(code) => {
            if (code.toLowerCase() === 'family2026' || code.toLowerCase() === 'vip') {
              setIsLifetimeLicensed(true);
              localStorage.setItem('tela_licensed', 'true');
              return true;
            }
            return false;
          }}
        />
      )}
    </div>
  );
};

export default App;
