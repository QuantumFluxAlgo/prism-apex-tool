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
