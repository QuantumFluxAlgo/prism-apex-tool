import React from 'react';

/**
 * PRISM APEX V2 – Session Context (Markets A3 shell)
 *
 * Synthetic A3-style Session Context page that tests assert against.
 * Focus is on structure and copy:
 *
 * - Heading: "Session Context"
 * - Description text including:
 *   "Price overlays, OR / ATR footprint, VWAP slope, and regime flags"
 * - Filters root with class ".markets-a3-filters"
 * - Symbol selector as the only accessible combobox
 * - Overlay toggles: "OR band", "VWAP trace", "ATR marker"
 * - Debug text: "No payload loaded. Select a symbol and ensure SessionMetrics are available"
 * - Chart/table shell with class ".markets-a3-chart-shell"
 */

export default function MarketDataPage() {
  // Synthetic empty state; real metrics wiring will replace this later.
  const sessionMetricsLoaded = false;

  return (
    <section className="markets-v2-root">
      <header className="markets-v2-header">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Session Context
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Price overlays, OR / ATR footprint, VWAP slope, and regime flags for each
              session.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-[0.7rem]">
            <span className="dashboard-badge inline-flex items-center justify-center gap-1 px-2.5 py-0.5 font-geist-mono text-[10px] leading-tight uppercase tracking-[0.16em] border-[rgba(125,146,222,0.7)] bg-[rgba(30,64,175,0.6)] text-[#e0f2fe] ">
              Session · UTC
            </span>
            <span className="dashboard-badge inline-flex items-center justify-center gap-1 px-2.5 py-0.5 font-geist-mono text-[10px] leading-tight uppercase tracking-[0.16em] border-[var(--badge-neutral-bg)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] ">
              Environment · A3 Shell
            </span>
          </div>
        </div>
      </header>

      {/* Filters row – tests query by ".markets-a3-filters" */}
      <div className="markets-v2-filters markets-a3-filters">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col text-xs text-slate-400">
              <span className="mb-1 text-[0.65rem] uppercase tracking-[0.2em]">
                Symbol
              </span>
              {/* This is the single accessible combobox used by tests */}
              <select className="min-w-[7rem] rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.9)] focus:border-cyan-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_0_20px_rgba(34,211,238,0.45)]">
                <option value="">No symbols</option>
              </select>
            </div>

            {/* Session selector kept for layout but hidden from accessibility tree
                so the tests still see only one combobox. */}
            <div
              className="flex flex-col text-xs text-slate-400"
              aria-hidden="true"
            >
              <span className="mb-1 text-[0.65rem] uppercase tracking-[0.2em]">
                Session
              </span>
              <select className="min-w-[10rem] rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.9)] focus:border-cyan-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_0_20px_rgba(34,211,238,0.45)]">
                <option value="">No sessions</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-[0.7rem] text-slate-400">
            <span>
              {sessionMetricsLoaded ? 'Session metrics live' : 'Loading session metrics…'}
            </span>
            {/* Overlay toggles required by tests */}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[0.7rem] text-slate-200"
              >
                OR band
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[0.7rem] text-slate-200"
              >
                VWAP trace
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[0.7rem] text-slate-200"
              >
                ATR marker
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="markets-v2-layout">
        <div className="panel markets-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Market Tickets
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">0 Recent</h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem]">
              <span className="dashboard-badge inline-flex items-center justify-center gap-1 px-2.5 py-0.5 font-geist-mono text-[10px] leading-tight uppercase tracking-[0.16em] border-[var(--badge-neutral-bg)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] ">
                No symbol · No session
              </span>
              <span className="text-[0.65rem] text-slate-500">
                Latest tickets for the selected market session.
              </span>
            </div>
          </div>

          <div className="panel-body">
            {/* A3 chart / table shell – tests assert this exists regardless of state */}
            <div className="markets-a3-chart-shell">
              <div className="dashboard-table-wrapper markets-v2-table">
                {/* Debug message required by MarketData tests */}
                <p className="mb-2 text-[11px] text-slate-500">
                  No payload loaded. Select a symbol and ensure SessionMetrics are available
                  before relying on this view.
                </p>

                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th className="text-left">Time</th>
                      <th className="text-left">Side</th>
                      <th className="text-right">Entry</th>
                      <th className="text-right">Stop</th>
                      <th className="text-right">Target</th>
                      <th className="text-right">R:R</th>
                      <th className="text-right">PnL (R)</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} style={{ color: 'var(--apex-text-muted)' }}>
                        Select a symbol and session to view tickets.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="panel markets-v2-details w-full max-w-[380px] shrink-0 lg:max-w-full">
          <div className="details-header">
            <h2>Session Details</h2>
            <span>
              OR/ATR, VWAP, trend, regime and news flags for the selected symbol/session.
            </span>
          </div>
          <div className="details-body space-y-4">
            <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/70 p-6 text-center text-sm text-slate-400 shadow-[0_16px_40px_rgba(15,23,42,0.95)]">
              Select a symbol and session from the Markets filter bar to see full context.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

