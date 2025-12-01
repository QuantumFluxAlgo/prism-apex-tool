import type React from 'react';

export interface DashboardNavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { path: '/worklist', label: 'Worklist' },
  { path: '/worklist-v2', label: 'Worklist V2 (Mock)' },
  { path: '/tickets', label: 'Tickets' },
  { path: '/market-data', label: 'Market Data' },
  { path: '/reports', label: 'Reports' },
  { path: '/strategy-lab', label: 'Strategy Lab' },
  { path: '/positions', label: 'Positions' },
  { path: '/strategy-config', label: 'Strategy Config' },
  { path: '/status', label: 'Status' },
  { path: '/alerts', label: 'Alerts' },
];
