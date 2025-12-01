#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – PATCH UI V2 A2 SHELL & TOKENS ==="

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

BACKUP_DIR="backups/ui_v2_a2_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo
echo "--- Backing up existing files to $BACKUP_DIR ---"
for f in \
  apps/dashboard/src/layouts/ExecutionShell.tsx \
  apps/dashboard/src/ui/Card.tsx \
  apps/dashboard/src/ui/Badge.tsx \
  apps/dashboard/src/index.css
do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp "$f" "$BACKUP_DIR/$f"
    echo "Backed up: $f"
  else
    echo "Missing (skipped backup): $f"
  fi
done

mkdir -p apps/dashboard/src/layouts
mkdir -p apps/dashboard/src/ui

echo
echo "--- Writing A2 ExecutionShell.tsx ---"
cat <<'TSX' > apps/dashboard/src/layouts/ExecutionShell.tsx
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
TSX

echo "Wrote apps/dashboard/src/layouts/ExecutionShell.tsx"

echo
echo "--- Writing Card.tsx (A2 panels) ---"
cat <<'TSX' > apps/dashboard/src/ui/Card.tsx
import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={[
        'dashboard-card',
        'rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[var(--bg-panel)]',
        'shadow-[0_0_0_1px_rgba(0,0,0,0.9)]',
        'text-[var(--text-primary)]',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}

type CardSectionProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <header
      className={[
        'dashboard-card__header',
        'border-b border-[rgba(255,255,255,0.04)] bg-[var(--bg-header)]',
        'px-4 py-3 rounded-t-2xl',
        className,
      ].join(' ')}
    >
      {children}
    </header>
  );
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={[
        'dashboard-card__body',
        'px-4 py-4 rounded-b-2xl bg-[var(--bg-panel)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
TSX

echo "Wrote apps/dashboard/src/ui/Card.tsx"

echo
echo "--- Writing Badge.tsx (A2 pills) ---"
cat <<'TSX' > apps/dashboard/src/ui/Badge.tsx
import React from 'react';

type Tone = 'default' | 'green' | 'amber' | 'red' | 'neutral' | 'blue' | 'yellow' | 'gray';

const toneClasses: Record<Tone, string> = {
  default:
    'border-[rgba(255,255,255,0.14)] bg-[rgba(9,15,28,0.9)] text-[var(--text-secondary)]',
  green:
    'border-[#4BE8A3] text-[#4BE8A3] bg-[rgba(75,232,163,0.12)]',
  amber:
    'border-[#FFC466] text-[#FFC466] bg-[rgba(255,196,102,0.12)]',
  red:
    'border-[#FF6A6A] text-[#FF6A6A] bg-[rgba(255,106,106,0.12)]',
  neutral:
    'border-[rgba(170,177,205,0.9)] text-[rgba(170,177,205,0.95)] bg-[rgba(9,15,28,0.9)]',
  blue:
    'border-[rgba(125,146,222,0.9)] text-[rgba(191,203,255,0.95)] bg-[rgba(11,15,28,0.9)]',
  yellow:
    'border-[#FFC466] text-[#FFC466] bg-[rgba(255,196,102,0.12)]',
  gray:
    'border-[rgba(125,146,222,0.55)] text-[rgba(181,191,230,0.95)] bg-[rgba(9,15,28,0.9)]',
};

export default function Badge({
  children,
  tone = 'default',
  title,
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  const toneClass = toneClasses[tone] ?? toneClasses.default;

  return (
    <span
      title={title}
      className={[
        'dashboard-badge',
        'inline-flex items-center justify-center gap-1',
        'rounded-full px-2.5 py-0.5',
        'font-geist-mono text-[10px] leading-tight',
        'uppercase tracking-[0.16em]',
        toneClass,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
TSX

echo "Wrote apps/dashboard/src/ui/Badge.tsx"

echo
echo "--- Writing index.css with A2 tokens & base styles ---"
cat <<'CSS' > apps/dashboard/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === PRISM APEX – A2 DESIGN TOKENS (Dashboard scope) === */
:root {
  --bg-shell: #050814;
  --bg-panel: #080D1C;
  --bg-header: #0B1222;
  --bg-table: #090F1C;
  --bg-deep: #050815;

  --text-primary: #E8EDF9;
  --text-secondary: #A1A9C3;
  --text-muted: #6C7594;

  --accent-primary: #42E2F4;
  --accent-soft: rgba(66, 226, 244, 0.16);

  --accent-strategy: #9B5CFF;
  --accent-amber: #FFC466;
  --accent-red: #FF6A6A;
  --accent-green: #4BE8A3;

  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-accent: rgba(66, 226, 244, 0.8);
  --border-steel: rgba(125, 146, 222, 0.9);
}

/* Fonts – assume Satoshi / Geist Mono are loaded globally via the app;
 * if not, they will fall back cleanly to system fonts.
 */
.font-satoshi {
  font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.font-geist-mono {
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, "Liberation Mono", "Courier New", monospace;
}

/* Global dashboard body baseline */
body {
  background-color: #020617;
  color: var(--text-primary);
}

/* Dashboard cards using A2 tokens */
.dashboard-card {
  background-color: var(--bg-panel);
  border-radius: 18px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.9);
}

.dashboard-card__header {
  background-color: var(--bg-header);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.dashboard-card__body {
  background-color: var(--bg-panel);
}

/* Table helpers for A2 look */
.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-table);
}

.dashboard-table thead {
  background-color: #0B1222;
}

.dashboard-table th {
  padding: 0.5rem 0.75rem;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-muted);
  text-align: left;
}

.dashboard-table td {
  padding: 0.45rem 0.75rem;
  font-size: 11px;
  color: var(--text-primary);
}

.dashboard-table tbody tr:nth-child(odd) {
  background-color: #090F1C;
}

.dashboard-table tbody tr:nth-child(even) {
  background-color: #080D1C;
}

.dashboard-table tbody tr:hover {
  background-color: #0C1426;
}

/* Badge baseline */
.dashboard-badge {
  white-space: nowrap;
}

/* Simple utility for KPI labels */
.kpi-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-muted);
}

.kpi-value {
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 20px;
  color: var(--text-primary);
}
CSS

echo "Wrote apps/dashboard/src/index.css"

echo
echo "--- V2 build audit ---"
pnpm run v2:build-audit || true

echo
echo "=== DONE – A2 shell & tokens patched. Check /worklist-v2, /tickets, /market-data, /analytics in the browser. ==="
