import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SystemStatusBar from '../components/SystemStatusBar';
import { DASHBOARD_NAV_ITEMS } from './dashboardNavConfig';

type DashboardShellProps = {
  children: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const { pathname } = useLocation();

  function isActive(path: string) {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Prism Apex Operator Dashboard</h1>
            <p className="text-sm text-slate-400">Shared shell for tickets, positions, reports, and metrics.</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <span>Session status</span>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="w-56 border-r border-slate-900 bg-slate-950/80">
          <nav className="flex flex-col gap-1 px-4 py-6 text-sm font-medium">
            {DASHBOARD_NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-md px-3 py-2 transition ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 bg-slate-900/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
            <SystemStatusBar />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
