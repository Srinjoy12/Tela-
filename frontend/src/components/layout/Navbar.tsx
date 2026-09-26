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
    <header className="bg-white border-b-2 border-black sticky top-0 z-40">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-neutral-200">
        {/* Left: Brand & Shop Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="font-black text-lg sm:text-xl tracking-tighter text-black shrink-0 select-none">
            TELA
          </span>

          <span className="text-neutral-300 font-light select-none shrink-0">|</span>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
            <span className="font-bold text-sm sm:text-base text-black truncate leading-tight">
              {shop?.name || 'My Store'}
            </span>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-500 leading-tight">
              <span className="hidden sm:inline text-neutral-300">•</span>
              <span className="truncate max-w-[110px] sm:max-w-none">
                {shop?.ownerName || 'Owner'}
              </span>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300 uppercase tracking-wider shrink-0">
                {shop?.businessType || 'Saree'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Logout Action */}
        <div className="shrink-0 pl-1">
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
      <nav className="flex overflow-x-auto hide-scrollbar scroll-smooth px-2 sm:px-4 bg-white">
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
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-neutral-700 hover:text-black hover:bg-neutral-100 border-transparent'
              }`}
            >
              <Icon width={14} height={14} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
