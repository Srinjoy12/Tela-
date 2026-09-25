import { formatINR } from '../../utils/i18n';
import React from 'react';
import {
  ReaderIcon as Receipt,
  ExclamationTriangleIcon as AlertTriangle,
  PlusIcon as Plus,
  FileTextIcon as FileSpreadsheet,
  ArrowRightIcon as ArrowRight
} from '@radix-ui/react-icons';
import type { Product, Bill, Goal, UserRole } from '../../types';
import { Button } from '../ui/button';
import { BWStatCard } from '../common/BWStatCard';

interface DashboardViewProps {
  products: Product[];
  bills: Bill[];
  currentGoal: Goal | null;
  userRole: UserRole;

  onNavigateToTab: (tab: any) => void;
  onOpenAddProduct: () => void;
  onOpenExcelUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  bills,
  currentGoal,
  userRole,

  onNavigateToTab,
  onOpenAddProduct,
  onOpenExcelUpload,
}) => {
  const isOwner = userRole === 'owner' || userRole === 'admin';

  // Date strings
  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // Active products
  const activeProducts = products.filter((p) => !p.archived);
  const totalPieces = activeProducts.reduce((acc, p) => acc + p.quantity, 0);
  const stockCostValue = activeProducts.reduce((acc, p) => acc + p.quantity * p.costPrice, 0);
  const stockRetailValue = activeProducts.reduce((acc, p) => acc + p.quantity * p.sellingPrice, 0);
  const lowStockCount = activeProducts.filter((p) => p.quantity <= p.alertLevel && p.quantity > 0).length;
  const outOfStockCount = activeProducts.filter((p) => p.quantity === 0).length;

  // Today's stats
  const todayBills = bills.filter((b) => b.status === 'completed' && b.date.startsWith(todayStr));
  const todaySales = todayBills.reduce((acc, b) => acc + b.total, 0);
  const todayProfit = todayBills.reduce((acc, b) => acc + b.totalProfit, 0);

  // This Month's stats
  const monthBills = bills.filter((b) => b.status === 'completed' && b.date.startsWith(currentMonthStr));
  const monthSales = monthBills.reduce((acc, b) => acc + b.total, 0);
  const monthProfit = monthBills.reduce((acc, b) => acc + b.totalProfit, 0);
  const monthPiecesSold = monthBills.reduce(
    (acc, b) => acc + b.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  // Goal progress
  const targetProfit = currentGoal?.profitTarget || 50000;
  const goalAchievedPercent = targetProfit > 0 ? Math.min(100, Math.round((monthProfit / targetProfit) * 100)) : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - new Date().getDate());

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Business Overview</h1>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenAddProduct} type="secondary" prefix={<Plus width={15} height={15} />}>
            Add New Product
          </Button>
          <Button onClick={onOpenExcelUpload} type="secondary" prefix={<FileSpreadsheet width={15} height={15} />}>
            Import Sheet
          </Button>
          <Button onClick={() => onNavigateToTab('BILLING')} type="primary" prefix={<Receipt width={15} height={15} />}>
            New Bill
          </Button>
        </div>
      </div>

      {/* PRIMARY STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BWStatCard
          label="Total Sarees In Stock"
          value={`${totalPieces} pcs`}
          subValue={`${activeProducts.length} unique designs`}
          onClick={() => onNavigateToTab('PRODUCTS')}
        />
        <BWStatCard
          label="Stock Value at Cost"
          value={isOwner ? formatINR(stockCostValue) : '••••••••'}
          subValue={isOwner ? 'Invested working capital' : 'Protected (Owner only)'}
        />
        <BWStatCard
          label="Stock Retail Value"
          value={formatINR(stockRetailValue)}
          subValue={`Potential profit: ${isOwner ? formatINR(stockRetailValue - stockCostValue) : 'Protected'}`}
        />
        <BWStatCard
          label="This Month's Profit"
          value={isOwner ? formatINR(monthProfit) : '••••••••'}
          subValue={`From ${formatINR(monthSales)} gross sales`}
          onClick={() => onNavigateToTab('REPORTS')}
        />
      </div>

      {/* SECONDARY ROW: TODAY'S ACTIVITY & GOAL TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Counter Activity */}
        <div className="bw-box flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="bw-label">Today's Counter Activity</span>
              <span className="bw-badge mono">{new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: '0.75rem' }}>
              <div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Today's Gross Sales:</div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {formatINR(todaySales)}
                </div>

              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Today's Gross Margin:</div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {isOwner ? formatINR(todayProfit) : '••••••••'}
                </div>

              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', paddingTop: '0.75rem', marginTop: '1rem' }}>
            <Button
              onClick={() => onNavigateToTab('BILLING')}
              type="primary"
              size="small"
              fullWidth
            >
              Open Quick Billing Counter →
            </Button>
          </div>
        </div>

        {/* Monthly Profit Goal Tracker Card */}
        <div className="bw-box flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="bw-label">Monthly Take-Home Profit Goal</span>
              <span className="bw-badge bw-badge-black mono">{goalAchievedPercent}% Met</span>
            </div>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
              {isOwner ? formatINR(monthProfit) : '••••••••'}{' '}
              <span style={{ fontSize: '1rem', fontWeight: 500 }}>of {formatINR(targetProfit)}</span>
            </div>

            {/* Strict progress line */}
            <div style={{ width: '100%', height: '12px', border: '1.5px solid #000', marginTop: '0.5rem', background: '#FFF' }}>
              <div style={{ width: `${goalAchievedPercent}%`, height: '100%', background: '#000' }} />
            </div>

            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              {daysLeft} days remaining this month. {monthPiecesSold} sarees sold so far.
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', paddingTop: '0.75rem', marginTop: '1rem' }}>
            <Button
              onClick={() => onNavigateToTab('GOALS')}
              type="secondary"
              size="small"
              fullWidth
            >
              View Daily Sarees-to-Sell Pace →
            </Button>
          </div>
        </div>
      </div>

      {/* STOCK ALERTS & SMART SUGGESTIONS */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="bw-box flex items-center justify-between" style={{ border: '2px solid #000' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle width={24} height={24} />
            <div>
              <div style={{ fontWeight: 700 }}>
                Inventory Restock Alerts: {lowStockCount} sarees low on stock, {outOfStockCount} out of stock
              </div>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                Re-order from weavers soon to avoid losing customers on popular designs.
              </p>
            </div>
          </div>
          <Button
            onClick={() => onNavigateToTab('PRODUCTS')}
            type="primary"
            size="small"
            suffix={<ArrowRight width={14} height={14} />}
          >
            Inspect Low Stock Sarees
          </Button>
        </div>
      )}
    </div>
  );
};
