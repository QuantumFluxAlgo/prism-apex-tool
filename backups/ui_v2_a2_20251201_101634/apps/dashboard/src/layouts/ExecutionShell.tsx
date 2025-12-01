import React from 'react';

type ExecutionShellTabKey =
  | 'worklist'
  | 'tickets'
  | 'markets'
  | 'analytics'
  | 'system'
  | 'strategy-lab'
  | 'alerts';

type ExecutionShellProps = {
  activeTab: ExecutionShellTabKey;
  children: React.ReactNode;
};

const TABS: Array<{ key: ExecutionShellTabKey; label: string; href: string }> = [
  { key: 'worklist', label: 'Worklist', href: '/worklist-v2' },
  { key: 'tickets', label: 'Tickets', href: '/tickets' },
  { key: 'markets', label: 'Markets', href: '/market-data' },
  { key: 'analytics', label: 'Analytics', href: '/analytics' },
  { key: 'system', label: 'System', href: '/status' },
  { key: 'strategy-lab', label: 'Strategy Lab', href: '/strategy-lab' },
  { key: 'alerts', label: 'Alerts', href: '/alerts' },
];

export default function ExecutionShell({ activeTab, children }: ExecutionShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Prism Apex — Execution &amp; Analytics
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
              Operator Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Shared shell for tickets, positions, reports, and metrics.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-slate-100">Session · UTC</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
              <span className="text-slate-400">Environment</span>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-100">
                A2 · Demo
              </span>
            </div>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs text-slate-300">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <a
                key={tab.key}
                href={tab.href}
                className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.5)] border border-cyan-400/70'
                    : 'border border-transparent hover:border-cyan-400/40 hover:text-slate-50'
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        <main className="mt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
