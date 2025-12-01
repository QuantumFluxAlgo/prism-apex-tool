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
    <div className="min-h-screen bg-[#020617] text-[var(--text-primary)]">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl rounded-[32px] border border-[rgba(255,255,255,0.07)] bg-[var(--bg-shell)] shadow-[0_32px_120px_rgba(0,0,0,0.9)]">
          {/* Shell header */}
          <header className="border-b border-[rgba(255,255,255,0.04)] bg-[var(--bg-header)] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-satoshi text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Prism Apex — Execution &amp; Analytics
                </p>
                <h1 className="font-satoshi text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Operator Dashboard
                </h1>
                <p className="font-satoshi text-xs text-[var(--text-secondary)]">
                  Shared shell for Worklist, Tickets, Markets, Analytics, and Strategy Lab.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-[var(--bg-deep)] px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-[#4BE8A3]" />
                  <span className="font-geist-mono text-[var(--text-primary)]">Session · UTC</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-[var(--bg-deep)] px-3 py-1">
                  <span className="font-satoshi text-[var(--text-muted)]">Environment</span>
                  <span className="rounded-full bg-[#050815] px-2 py-0.5 font-geist-mono text-[10px] text-[var(--text-primary)]">
                    A2 · Dark · Demo
                  </span>
                </div>
              </div>
            </div>

            {/* Primary nav tabs */}
            <nav className="mt-4 flex flex-wrap items-center gap-2">
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <a
                    key={tab.key}
                    href={tab.href}
                    className={[
                      'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                      'font-satoshi',
                      isActive
                        ? 'border-[rgba(66,226,244,0.85)] bg-[rgba(66,226,244,0.16)] text-[#E8FBFF] shadow-[0_0_18px_rgba(66,226,244,0.55)]'
                        : 'border-[rgba(255,255,255,0.07)] bg-[#0B1222] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(66,226,244,0.6)]',
                    ].join(' ')}
                  >
                    {tab.label}
                  </a>
                );
              })}
            </nav>
          </header>

          {/* Page content */}
          <main className="px-6 pb-6 pt-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
