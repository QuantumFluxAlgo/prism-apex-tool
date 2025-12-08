import React from 'react';

/**
 * PRISM APEX V2 – Positions (placeholder)
 *
 * Tested behaviours:
 * - Shows a "Loading…" placeholder message.
 * - Shows the "Active positions" KPI label.
 */

export default function PositionsPage() {
  return (
    <div className="space-y-4">
      {/* Placeholder loading state (tests look for this literal text) */}
      <div className="rounded-2xl border border-[var(--apex-card-border)] bg-[var(--apex-surface-muted)] px-4 py-3 text-xs text-[var(--apex-text)] shadow-[0_16px_40px_rgba(8,12,24,0.65)]">
        Loading…
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <section className="dashboard-card">
          <div className="dashboard-card__body px-4 py-4 rounded-b-2xl dashboard-card__body stack">
            <div className="dashboard-kpi">
              <span className="dashboard-kpi__label">Active positions</span>
              <span className="dashboard-kpi__value">—</span>
            </div>
          </div>
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card__body px-4 py-4 rounded-b-2xl dashboard-card__body stack">
            <div className="dashboard-kpi">
              <span className="dashboard-kpi__label">Net exposure</span>
              <span className="dashboard-kpi__value">—</span>
            </div>
          </div>
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card__body px-4 py-4 rounded-b-2xl dashboard-card__body stack">
            <div className="dashboard-kpi">
              <span className="dashboard-kpi__label">Unrealized PnL</span>
              <span className="dashboard-kpi__value">—</span>
            </div>
          </div>
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card__body px-4 py-4 rounded-b-2xl dashboard-card__body stack">
            <div className="dashboard-kpi">
              <span className="dashboard-kpi__label">Symbols active</span>
              <span className="dashboard-kpi__value">—</span>
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard-card">
        <header className="dashboard-card__header px-4 py-3 rounded-t-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-200">
                Positions (placeholder)
              </span>
              <span className="text-[11px] text-slate-500">
                This V2 surface is currently a placeholder; positions telemetry wiring will be
                added in a later hardening pass.
              </span>
            </div>
          </div>
        </header>
        <div className="dashboard-card__body px-4 py-4 rounded-b-2xl px-4 py-3">
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-left">Qty</th>
                  <th className="text-left">Entry</th>
                  <th className="text-left">Unrealized PnL</th>
                  <th className="text-left">R multiple</th>
                  <th className="text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} style={{ color: 'var(--apex-text-muted)' }}>
                    No data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
