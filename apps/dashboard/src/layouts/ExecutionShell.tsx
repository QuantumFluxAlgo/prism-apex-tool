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
