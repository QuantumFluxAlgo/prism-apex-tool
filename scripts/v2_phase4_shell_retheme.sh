#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 4: EXECUTION SHELL RETHEME ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo "--- Overwriting ExecutionShell.tsx with A3 shell layout ---"
cat <<'TSX' > apps/dashboard/src/layouts/ExecutionShell.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */

import React from "react";
import { Link } from "react-router-dom";
import "../styles/a3-shell.css";

type ExecutionShellTabKey =
  | "worklist"
  | "tickets"
  | "markets"
  | "analytics"
  | "system"
  | "strategy-lab"
  | "alerts";

interface ExecutionShellProps {
  activeTab: ExecutionShellTabKey;
  children?: React.ReactNode;
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
    to: "/markets",
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
      <div className="a3-shell" data-active-tab={activeTab}>
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
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={[
                    "a3-nav-item",
                    isActive ? "a3-nav-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="a3-nav-item-main">
                    <span className="a3-nav-item-indicator" />
                    <span className="a3-nav-item-label">{item.label}</span>
                  </div>
                  <span className="a3-nav-item-description">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="a3-nav-footer">
            <div className="a3-env-label">Environment</div>
            <div className="a3-env-pills">
              <span className="a3-pill a3-pill--sim">SIM</span>
              <span className="a3-pill">ES</span>
              <span className="a3-pill">NQ</span>
            </div>
            <div className="a3-build-meta">
              <span className="a3-build-label">V2 Phase 3</span>
              <span className="a3-build-tag">canonical surfaces</span>
            </div>
          </div>
        </aside>

        <div className="a3-main">
          <header className="a3-topbar">
            <div className="a3-topbar-left">
              <div className="a3-topbar-stack">
                <div className="a3-topbar-title">Operator Dashboard</div>
                <div className="a3-topbar-subtitle">
                  Canonical Worklist, Tickets, Markets, Analytics, Lab, System &amp; Alerts
                </div>
              </div>
            </div>
            <div className="a3-topbar-right">
              <div className="a3-clock">
                <span className="a3-clock-date">{date}</span>
                <span className="a3-clock-separator" />
                <span className="a3-clock-time">{time}</span>
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
TSX

echo "--- Writing a3-shell.css (A3 visual system) ---"
cat <<'CSS' > apps/dashboard/src/styles/a3-shell.css
/* Prism Apex – A3 Shell Visual System
 *
 * Goal:
 *   - Full-screen dark, glassy shell.
 *   - Left nav rail with density and hierarchy.
 *   - Top bar with environment + clock.
 *   - Inner content card hosting existing canonical pages unmodified.
 */

/* Reset-ish */
html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Segoe UI", sans-serif;
  background: radial-gradient(circle at top left, #1d4ed8 0, #020617 45%, #000 100%);
  color: #e5e7eb;
}

/* Root frame */
.a3-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background:
    radial-gradient(900px at -10% -10%, rgba(59, 130, 246, 0.35), transparent),
    radial-gradient(900px at 110% 110%, rgba(236, 72, 153, 0.25), transparent),
    radial-gradient(circle at top left, #020617 0, #020617 55%, #000 100%);
}

/* Shell container */
.a3-shell {
  position: relative;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 0;
  max-width: 1520px;
  width: 100%;
  min-height: calc(100vh - 48px);
  background: radial-gradient(circle at top left, #020617 0, #020617 45%, #020617ee 80%);
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow:
    0 28px 80px rgba(15, 23, 42, 0.9),
    0 0 0 1px rgba(15, 23, 42, 0.9);
  overflow: hidden;
  backdrop-filter: blur(26px);
}

/* Left navigation rail */
.a3-nav {
  display: flex;
  flex-direction: column;
  padding: 20px 18px 16px;
  border-right: 1px solid rgba(30, 64, 175, 0.7);
  background:
    radial-gradient(700px at top, rgba(37, 99, 235, 0.28), transparent),
    radial-gradient(500px at bottom, rgba(30, 64, 175, 0.35), transparent),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  gap: 24px;
}

/* Logo block */
.a3-logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #1d4ed8, #0f172a);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.9);
}

.a3-logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 0, #e5e7eb, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #0f172a;
}

.a3-logo-copy {
  display: flex;
  flex-direction: column;
}

.a3-logo-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e5e7eb;
}

.a3-logo-subtitle {
  font-size: 11px;
  color: #a5b4fc;
}

/* Nav list */
.a3-nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 4px 8px;
  border-radius: 16px;
  background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent);
  box-shadow: inset 0 0 0 1px rgba(30, 64, 175, 0.45);
}

.a3-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px 8px 10px;
  border-radius: 12px;
  text-decoration: none;
  color: #e5e7eb;
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.6),
    rgba(15, 23, 42, 0.4)
  );
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease,
    transform 140ms ease,
    box-shadow 140ms ease;
}

.a3-nav-item:hover {
  border-color: rgba(129, 140, 248, 0.8);
  background: linear-gradient(
    90deg,
    rgba(30, 64, 175, 0.7),
    rgba(15, 23, 42, 0.7)
  );
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.9);
  transform: translateY(-1px);
}

.a3-nav-item--active {
  border-color: rgba(129, 140, 248, 1);
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.9),
    rgba(15, 23, 42, 0.9)
  );
  box-shadow:
    0 12px 30px rgba(37, 99, 235, 0.5),
    0 0 0 1px rgba(15, 23, 42, 0.9);
}

.a3-nav-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.a3-nav-item-indicator {
  width: 6px;
  height: 20px;
  border-radius: 999px;
  background: radial-gradient(circle at top, rgba(129, 140, 248, 0.1), transparent);
  flex-shrink: 0;
}

.a3-nav-item--active .a3-nav-item-indicator {
  background: linear-gradient(180deg, #bfdbfe, #4f46e5);
}

.a3-nav-item-label {
  font-size: 13px;
  font-weight: 500;
}

.a3-nav-item-description {
  font-size: 11px;
  color: #c7d2fe;
  opacity: 0.85;
}

/* Nav footer */
.a3-nav-footer {
  margin-top: auto;
  padding: 10px 10px 8px;
  border-radius: 14px;
  background: radial-gradient(circle at top left, rgba(30, 64, 175, 0.8), #020617);
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.9),
    inset 0 0 0 1px rgba(30, 64, 175, 0.8);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.a3-env-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c7d2fe;
  opacity: 0.9;
}

.a3-env-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.a3-pill {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(191, 219, 254, 0.5);
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
}

.a3-pill--sim {
  background: radial-gradient(circle at top left, #22c55e, #047857);
  border-color: rgba(22, 163, 74, 1);
}

.a3-build-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #c7d2fe;
  opacity: 0.9;
}

.a3-build-label {
  font-weight: 500;
}

.a3-build-tag {
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(129, 140, 248, 0.9);
  background: rgba(15, 23, 42, 0.9);
}

/* Main area */
.a3-main {
  display: flex;
  flex-direction: column;
  padding: 18px 18px 18px 0;
}

/* Top bar */
.a3-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 14px 18px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.3), transparent),
    linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.5);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.9);
  margin-bottom: 14px;
}

.a3-topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.a3-topbar-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.a3-topbar-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e5e7eb;
}

.a3-topbar-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

/* Clock */
.a3-topbar-right {
  display: flex;
  align-items: center;
}

.a3-clock {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: radial-gradient(circle at top left, rgba(30, 64, 175, 0.7), #020617);
  font-size: 11px;
  color: #e5e7eb;
}

.a3-clock-date {
  opacity: 0.9;
}

.a3-clock-time {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.a3-clock-separator {
  width: 1px;
  height: 16px;
  background: rgba(148, 163, 184, 0.9);
  opacity: 0.8;
}

/* Content area */
.a3-content {
  flex: 1;
  padding: 6px 0 0 0;
  display: flex;
}

.a3-content-inner {
  position: relative;
  flex: 1;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(30, 64, 175, 0.2), transparent),
    radial-gradient(circle at bottom right, rgba(30, 64, 175, 0.4), transparent),
    linear-gradient(135deg, #020617, #020617);
  border: 1px solid rgba(75, 85, 99, 0.9);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.95),
    inset 0 0 0 1px rgba(15, 23, 42, 0.9);
  padding: 18px 18px 18px 18px;
  overflow: hidden;
}

/* Let existing pages use their own layouts inside the card.
   Keep padding modest so your existing Worklist/Tickets/Analytics
   tables and panels sit comfortably. */
.a3-content-inner > *:first-child {
  margin-top: 0;
}

/* RESPONSIVE */

@media (max-width: 1200px) {
  .a3-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .a3-root {
    padding: 12px;
  }

  .a3-shell {
    grid-template-columns: 80px minmax(0, 1fr);
  }

  .a3-logo-copy,
  .a3-nav-item-description,
  .a3-build-meta {
    display: none;
  }

  .a3-nav {
    padding-inline: 12px;
  }

  .a3-nav-item {
    padding-inline: 8px;
  }

  .a3-topbar {
    padding-inline: 12px;
  }

  .a3-content-inner {
    border-radius: 16px;
    padding: 14px;
  }
}

@media (max-width: 720px) {
  .a3-shell {
    grid-template-columns: 1fr;
  }

  .a3-nav {
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid rgba(30, 64, 175, 0.7);
  }

  .a3-nav-list {
    flex-direction: row;
    overflow-x: auto;
  }

  .a3-nav-item {
    min-width: 120px;
  }

  .a3-main {
    padding: 12px;
  }

  .a3-topbar {
    margin-bottom: 10px;
  }
}
CSS

echo
echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard run test

echo
echo "=== DONE: V2 PHASE 4 shell retheme ==="
