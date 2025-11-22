import type React from 'react';

export interface DashboardNavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { path: '/worklist', label: 'Worklist' },
  { path: '/tickets', label: 'Tickets' },
  { path: '/positions', label: 'Positions' },
  { path: '/reports', label: 'Reports' },
  { path: '/market-data', label: 'Market Data' },
  { path: '/strategy-config', label: 'Strategy Config' },
  { path: '/status', label: 'Status' },
];
