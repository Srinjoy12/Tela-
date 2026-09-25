import React from 'react';
import {
  DashboardIcon as LayoutDashboard,
  CubeIcon as Package,
  ReaderIcon as Receipt,
  TargetIcon as Target,
  BarChartIcon as FileBarChart,
  PersonIcon as Users,
  ExitIcon as LogOut,
  ThickArrowRightIcon as Truck
} from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import type { UserRole, Shop } from '../../types';


export type NavTab = 'DASHBOARD' | 'PRODUCTS' | 'SUPPLIERS' | 'BILLING' | 'GOALS' | 'REPORTS' | 'CUSTOMERS';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  shop: Shop | null;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  userIdentifier?: string;
  setUserIdentifier?: (id: string) => void;

  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  shop,
  onLogout,
}) => {
  return (
    <header style={{ borderBottom: '2px solid #000', background: '#FFF' }}>
      {/* Top Meta Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0"
        style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #DDD', fontSize: '0.85rem' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <div className="flex items-center gap-1" style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.05em' }}>
            TELA
          </div>
          <span className="text-muted hidden sm:inline">|</span>
          <span style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1rem' }}>
            {shop?.name || 'My Store'}
          </span>
          <span className="text-muted hidden sm:inline">|</span>
          <span style={{ fontSize: '0.8rem', color: '#555' }}>
            {shop?.ownerName || 'Owner'} <span className="hidden sm:inline">({shop?.businessType || 'Saree'})</span>
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar" style={{ width: '100%', justifyContent: 'flex-end' }}>





          {/* Logout Button */}
          <Button
            onClick={onLogout}
            type="secondary"
            size="tiny"
            prefix={<LogOut width={12} height={12} />}
            title="Log out from this shop and return to login screen"
          >
            Log Out
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex" style={{ padding: '0 1rem', overflowX: 'auto' }}>
        {[
          { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'PRODUCTS', label: 'Products', icon: Package },
          { id: 'SUPPLIERS', label: 'Suppliers', icon: Truck },
          { id: 'BILLING', label: 'Billing', icon: Receipt },
          { id: 'GOALS', label: 'Goals', icon: Target },
          { id: 'REPORTS', label: 'Reports', icon: FileBarChart },
          { id: 'CUSTOMERS', label: 'Customers', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as NavTab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1rem',
                background: isActive ? '#000' : 'transparent',
                color: isActive ? '#FFF' : '#000',
                border: 'none',
                borderBottom: isActive ? '3px solid #000' : '3px solid transparent',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon width={15} height={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
