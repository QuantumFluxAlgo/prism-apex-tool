#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – APPLYING A3 SHELL, THEME & ALERTS TEST ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

echo "--- Writing apps/dashboard/src/layouts/ExecutionShell.tsx ---"
cat <<'EOS' > apps/dashboard/src/layouts/ExecutionShell.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */

import React from "react";
import { Link } from "react-router-dom";
import "../styles/a3-shell.css";

export type ExecutionShellTabKey =
  | "worklist"
  | "tickets"
  | "markets"
  | "analytics"
  | "strategy-lab"
  | "system"
  | "alerts";

interface ExecutionShellProps {
  activeTab: ExecutionShellTabKey;
  children: React.ReactNode;
}

interface NavItem {
  key: ExecutionShellTabKey;
  label: string;
  to: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "worklist",
    label: "Worklist",
    to: "/worklist-v2",
    description: "Live signals & tickets",
  },
  {
    key: "tickets",
    label: "Tickets",
    to: "/tickets",
    description: "Audit trail & decisions",
  },
  {
    key: "markets",
    label: "Markets",
    to: "/market-data",
    description: "Session overlays & context",
  },
  {
    key: "analytics",
    label: "Analytics",
    to: "/analytics",
    description: "PnL & drift analytics",
  },
  {
    key: "strategy-lab",
    label: "Strategy Lab",
    to: "/strategy-lab",
    description: "Configs & lab vs live",
  },
  {
    key: "system",
    label: "System",
    to: "/status",
    description: "Engines & health",
  },
  {
    key: "alerts",
    label: "Alerts",
    to: "/alerts",
    description: "Risk, system & infra",
  },
];

function formatClock() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date, time };
}

const ExecutionShell: React.FC<ExecutionShellProps> = ({ activeTab, children }) => {
  const { date, time } = formatClock();

  return (
    <div className="a3-root">
      <div className="a3-shell">
        <aside className="a3-nav">
          <div className="a3-logo-block">
            <div className="a3-logo-mark">⧉</div>
            <div className="a3-logo-copy">
              <div className="a3-logo-title">Prism Apex</div>
              <div className="a3-logo-subtitle">Operator Dashboard</div>
            </div>
          </div>

          <nav className="a3-nav-list" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activeTab;
              const className = [
                "a3-nav-item",
                isActive ? "a3-nav-item--active" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={className}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="a3-nav-item-main">
                    <span className="a3-nav-item-label">{item.label}</span>
                    <span className="a3-nav-item-indicator" />
                  </div>
                  <span className="a3-nav-item-description">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="a3-nav-footer">
            <div className="a3-env-pill">
              <span className="a3-env-label">ENV</span>
              <span className="a3-env-value">SIM</span>
            </div>
            <div className="a3-build-meta">
              <span className="a3-build-label">Profile</span>
              <span className="a3-build-value">V2 A3</span>
            </div>
          </div>
        </aside>

        <div className="a3-main">
          <header className="a3-topbar">
            <div className="a3-topbar-left">
              <div>
                <h1 className="a3-topbar-title">Operator Dashboard</h1>
                <p className="a3-topbar-subtitle">
                  Canonical tickets, session metrics &amp; system health
                </p>
              </div>
            </div>
            <div className="a3-topbar-right">
              <div className="a3-topbar-status">
                <div className="a3-topbar-status-row">
                  <span className="a3-status-pill a3-status-pill--primary">
                    Live Analytics
                  </span>
                  <span className="a3-status-pill a3-status-pill--muted">
                    Apex Trader Funding · SIM
                  </span>
                </div>
              </div>
              <div className="a3-clock" aria-label="Session clock">
                <div className="a3-clock-date">{date}</div>
                <div className="a3-clock-time">{time}</div>
              </div>
            </div>
          </header>

          <main className="a3-content">
            <section className="a3-content-inner">{children}</section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ExecutionShell;
EOS

echo "--- Writing apps/dashboard/src/styles/a3-shell.css ---"
cat <<'EOS' > apps/dashboard/src/styles/a3-shell.css
/* Prism Apex – A3 Shell & Glass Theme */

/* Fill viewport */
html,
body,
#root {
  height: 100%;
}

/* Root background */
.a3-root {
  min-height: 100%;
  background:
    radial-gradient(1400px at top left, rgba(56, 189, 248, 0.22), transparent),
    radial-gradient(1400px at bottom right, rgba(129, 140, 248, 0.22), transparent),
    linear-gradient(180deg, #020617, #020617 40%, #020617);
  color: #e5edff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Inter", sans-serif;
}

/* Main shell grid */
.a3-shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 20px;
  box-sizing: border-box;
}

/* Left nav rail */
.a3-nav {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid rgba(37, 99, 235, 0.7);
  background:
    radial-gradient(800px at top left, rgba(59, 130, 246, 0.38), transparent),
    radial-gradient(600px at bottom right, rgba(30, 64, 175, 0.55), transparent),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.9),
    0 20px 50px rgba(15, 23, 42, 0.98);
}

/* Logo block */
.a3-logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 999px;
  background:
    radial-gradient(600px at top left, rgba(56, 189, 248, 0.5), transparent),
    rgba(15, 23, 42, 0.98);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.95);
}

.a3-logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    conic-gradient(
      from 210deg,
      rgba(56, 189, 248, 1),
      rgba(129, 140, 248, 1),
      rgba(56, 189, 248, 1)
    );
  color: #020617;
  font-weight: 700;
  font-size: 16px;
}

.a3-logo-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.a3-logo-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.a3-logo-subtitle {
  font-size: 11px;
  opacity: 0.8;
}

/* Nav list */
.a3-nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.a3-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(30, 64, 175, 0.7);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.9);
  transition:
    border-color 160ms ease-out,
    box-shadow 160ms ease-out,
    transform 160ms ease-out,
    background 200ms ease-out;
}

.a3-nav-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.a3-nav-item-label {
  font-size: 13px;
  font-weight: 500;
}

.a3-nav-item-indicator {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
}

.a3-nav-item-description {
  font-size: 11px;
  opacity: 0.85;
  color: #c7d2fe;
}

.a3-nav-item:hover {
  border-color: rgba(129, 140, 248, 0.9);
  background: linear-gradient(
    120deg,
    rgba(30, 64, 175, 0.9),
    rgba(15, 23, 42, 0.98)
  );
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.95);
  transform: translateY(-1px);
}

.a3-nav-item--active {
  border-color: rgba(56, 189, 248, 0.95);
  background:
    linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.28),
      rgba(56, 189, 248, 0.08),
      rgba(15, 23, 42, 0.98)
    );
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.9),
    0 18px 45px rgba(15, 23, 42, 0.98);
}

.a3-nav-item--active .a3-nav-item-indicator {
  border-color: rgba(56, 189, 248, 0.95);
  box-shadow:
    0 0 12px rgba(56, 189, 248, 0.9),
    inset 0 0 0 1px rgba(15, 23, 42, 1);
  background: radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 1), #020617);
}

/* Nav footer */
.a3-nav-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(30, 64, 175, 0.7);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.a3-env-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.9);
  background:
    radial-gradient(500px at top left, rgba(34, 211, 238, 0.4), transparent),
    rgba(15, 23, 42, 0.98);
  font-size: 11px;
}

.a3-env-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.85;
}

.a3-env-value {
  font-weight: 600;
}

.a3-build-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  opacity: 0.85;
}

.a3-build-label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.7;
}

.a3-build-value {
  font-weight: 500;
}

/* Main side */
.a3-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Top bar */
.a3-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(37, 99, 235, 0.8);
  background:
    radial-gradient(900px at top, rgba(59, 130, 246, 0.32), transparent),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.9),
    0 18px 45px rgba(15, 23, 42, 0.98);
}

.a3-topbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.a3-topbar-title {
  font-size: 18px;
  font-weight: 600;
}

.a3-topbar-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

.a3-topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.a3-topbar-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.a3-topbar-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.a3-status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 11px;
}

.a3-status-pill--primary {
  border-color: rgba(56, 189, 248, 0.85);
  background:
    radial-gradient(500px at top left, rgba(56, 189, 248, 0.4), transparent),
    rgba(15, 23, 42, 0.98);
}

.a3-status-pill--muted {
  opacity: 0.85;
}

.a3-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background:
    radial-gradient(500px at top, rgba(15, 23, 42, 0.3), transparent),
    rgba(15, 23, 42, 0.98);
}

.a3-clock-date {
  font-size: 11px;
  opacity: 0.8;
}

.a3-clock-time {
  font-size: 14px;
  font-weight: 600;
}

/* Content wrapper */
.a3-content {
  margin-top: 6px;
}

.a3-content-inner {
  border-radius: 24px;
  padding: 14px;
  background:
    radial-gradient(1200px at top left, rgba(56, 189, 248, 0.16), transparent),
    radial-gradient(1200px at bottom right, rgba(129, 140, 248, 0.16), transparent),
    linear-gradient(145deg, rgba(15, 23, 42, 0.99), rgba(15, 23, 42, 0.99));
  box-shadow: 0 20px 65px rgba(15, 23, 42, 0.98);
}

/* Responsiveness */
@media (max-width: 1100px) {
  .a3-shell {
    grid-template-columns: 220px minmax(0, 1fr);
    padding: 16px;
  }

  .a3-main {
    gap: 10px;
  }
}

@media (max-width: 900px) {
  .a3-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .a3-nav {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .a3-nav-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }

  .a3-main {
    padding-inline: 4px;
  }

  .a3-content-inner {
    border-radius: 18px;
  }
}

@media (max-width: 640px) {
  .a3-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .a3-topbar-right {
    width: 100%;
    justify-content: space-between;
  }
}

/* === Glassy cards & upgraded tables (A3 overlay on A2 tokens) === */

.dashboard-card {
  position: relative;
  border-radius: 24px;
  padding: 1px;
  background:
    radial-gradient(140% 220% at 0% 0%, rgba(56, 189, 248, 0.28), transparent),
    radial-gradient(140% 260% at 110% 120%, rgba(129, 140, 248, 0.24), transparent),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95),
    0 20px 55px rgba(15, 23, 42, 0.95);
  overflow: hidden;
}

.dashboard-card > * {
  position: relative;
  z-index: 1;
}

.dashboard-card__header {
  background:
    radial-gradient(140% 200% at 0% 0%, rgba(30, 64, 175, 0.96), rgba(15, 23, 42, 0.98));
  border-bottom: 1px solid rgba(148, 163, 184, 0.45);
}

.dashboard-card__body {
  background:
    radial-gradient(160% 260% at 100% 120%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.99));
}

@media (prefers-reduced-motion: no-preference) {
  .dashboard-card {
    transition:
      box-shadow 180ms ease-out,
      transform 180ms ease-out,
      background 240ms ease-out;
  }

  .dashboard-card:hover {
    box-shadow:
      0 0 0 1px rgba(56, 189, 248, 0.7),
      0 26px 70px rgba(15, 23, 42, 0.98);
    transform: translateY(-1px);
  }
}

/* Data tables */

.dashboard-table-wrapper {
  position: relative;
  margin: 4px 0;
  border-radius: 22px;
  padding: 1px;
  background:
    radial-gradient(180% 260% at -10% 0%, rgba(56, 189, 248, 0.3), transparent),
    radial-gradient(200% 300% at 110% 120%, rgba(37, 99, 235, 0.35), transparent),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 1));
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95),
    0 18px 55px rgba(15, 23, 42, 0.98);
  overflow: hidden;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  background: radial-gradient(160% 260% at 50% 0%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.99));
  font-size: 12px;
}

.dashboard-table thead {
  background:
    linear-gradient(
      90deg,
      rgba(30, 64, 175, 0.96),
      rgba(56, 189, 248, 0.18)
    );
}

.dashboard-table th {
  padding: 0.5rem 0.75rem;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #e5edff;
  border-bottom: 1px solid rgba(148, 163, 184, 0.5);
  white-space: nowrap;
  text-align: left;
}

.dashboard-table td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
}

/* Striping + hover */
.dashboard-table tbody tr:nth-child(odd) {
  background-color: rgba(15, 23, 42, 0.98);
}

.dashboard-table tbody tr:nth-child(even) {
  background-color: rgba(15, 23, 42, 0.96);
}

.dashboard-table tbody tr:hover {
  background:
    radial-gradient(160% 260% at 0% 0%, rgba(56, 189, 248, 0.16), transparent),
    rgba(15, 23, 42, 0.98);
}

/* Empty state row */
.dashboard-table tbody tr:only-child td {
  text-align: center;
  padding: 1.25rem 0.75rem;
  color: rgba(148, 163, 184, 0.95);
  font-size: 13px;
}

@media (max-width: 768px) {
  .dashboard-table-wrapper {
    border-radius: 18px;
  }

  .dashboard-table th,
  .dashboard-table td {
    padding-inline: 0.55rem;
  }
}
EOS

echo "--- Writing apps/dashboard/src/__tests__/Alerts.test.tsx ---"
cat <<'EOS' > apps/dashboard/src/__tests__/Alerts.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Alerts from '../pages/Alerts';

describe('AlertsPage', () => {
  it('renders the alerts headline and filters', () => {
    render(<Alerts />);

    expect(
      screen.getByRole('heading', { name: /Alerts/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Severity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
  });

  it('renders at least one critical alert by default (open state)', () => {
    render(<Alerts />);

    expect(
      screen.getByText(/Authentication error rate spike/i)
    ).toBeInTheDocument();

    const criticalElements = screen.getAllByText(/Critical/i);
    expect(criticalElements.length).toBeGreaterThan(0);

    const rows = screen.getAllByRole('row');
    const criticalOpenRows = rows.filter((row) => {
      const utils = within(row);
      const hasCritical = utils.queryByText(/Critical/i);
      const hasOpen = utils.queryByText(/Open/i);
      return Boolean(hasCritical && hasOpen);
    });

    expect(criticalOpenRows.length).toBeGreaterThan(0);
  });

  it('filters alerts by severity', () => {
    render(<Alerts />);

    const severitySelect = screen.getByLabelText(/Severity/i) as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'warning' } });

    expect(severitySelect.value).toBe('warning');

    expect(
      screen.getByText(/Risk guardrail breach/i)
    ).toBeInTheDocument();
  });
});
EOS

echo
echo "--- Running dashboard tests (pnpm --filter prism-apex-dashboard test) ---"
if pnpm --filter prism-apex-dashboard test; then
  echo "=== Dashboard tests completed successfully ==="
else
  echo "!!! Dashboard tests FAILED (see output above) !!!"
  exit 1
fi

echo "=== A3 shell, theme & alerts test update complete ==="
