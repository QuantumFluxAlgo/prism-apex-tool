// @ts-nocheck
/* eslint-disable */

/**
 * PRISM APEX V2 — Analytics (PnL & Drift Analytics, A3 cockpit)
 *
 * Design intent:
 * - Visually aligned with Worklist V2 A3 shell (header, filters, dual-panel layout).
 * - No new backend endpoints: reuses /api/tickets via useTicketsHistory().
 * - Derives PnL and win/loss analytics from canonical ticket rows.
 * - Left: strategy-level PnL table + synthetic sparkline.
 * - Right: details panel for the selected strategy.
 */

import React, { useMemo, useState } from 'react';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import { fmtPrice } from '../utils/number';
import { useTicketsHistory } from '../hooks/useTicketsHistory';
import '../styles/analytics-a3.css';

const DAY_MS = 24 * 60 * 60 * 1000;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

type AnalyticsTicket = {
  key: string;
  raw: any;
  openedDate: string; // YYYY-MM-DD
  symbol: string;
  strategy: string;
  side: string;
  pnlDollars: number | null;
  pnlR: number | null;
};

type StrategyStats = {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  flat: number;
  pnlDollars: number;
  pnlR: number;
  avgR: number | null;
  winRate: number | null;
};

type FiltersState = {
  from: string;
  to: string;
  symbol: string;
  strategy: string;
  search: string;
};

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

function deriveOpenedDate(row: any): string {
  const opened =
    row.opened_at_utc ??
    row.openedAtUtc ??
    row.createdAtUtc ??
    row.canonicalApproved?.createdAtUtc ??
    null;

  if (!opened) return '1970-01-01';
  const d = new Date(opened);
  if (Number.isNaN(d.getTime())) return '1970-01-01';
  return d.toISOString().slice(0, 10);
}

function deriveSide(row: any): string {
  const side =
    row.side ??
    row.direction ??
    row.canonicalApproved?.side ??
    null;

  const s = safeString(side).toUpperCase();
  if (s === 'LONG' || s === 'BUY') return 'LONG';
  if (s === 'SHORT' || s === 'SELL') return 'SHORT';
  return s || '—';
}

function derivePnlDollars(row: any): number | null {
  const value =
    row.pnlDollars ??
    row.pnl_dollars ??
    row.realizedPnlDollars ??
    row.realized_pnl_dollars ??
    row.meta?.pnlDollars ??
    null;

  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function derivePnlR(row: any): number | null {
  const value =
    row.pnlRMultiple ??
    row.pnl_r_multiple ??
    row.pnlRatio ??
    row.pnl_ratio ??
    row.rrOutcome ??
    null;

  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function mapToAnalyticsTicket(row: any): AnalyticsTicket {
  const symbol = safeString(row.symbol ?? row.canonicalApproved?.symbol ?? '—');
  const strategyId =
    row.strategy ??
    row.strategyId ??
    row.canonicalApproved?.strategyId ??
    '—';

  const key =
    row.id ??
    row.ticketId ??
    row.canonicalApproved?.ticketId ??
    `${symbol}-${strategyId}-${row.opened_at_utc ?? row.createdAtUtc ?? ''}`;

  return {
    key: safeString(key),
    raw: row,
    openedDate: deriveOpenedDate(row),
    symbol,
    strategy: safeString(strategyId),
    side: deriveSide(row),
    pnlDollars: derivePnlDollars(row),
    pnlR: derivePnlR(row),
  };
}

function AnalyticsSparkline({ values }: { values: number[] }) {
  const safe = values.length ? values : [0];
  const maxAbs = safe.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0) || 1;

  return (
    <div className="analytics-sparkline">
      {safe.map((v, idx) => {
        const heightPct = (Math.abs(v) / maxAbs) * 100;
        const isWin = v > 0;
        const isLoss = v < 0;
        const cls = isWin
          ? 'analytics-sparkline-bar-win'
          : isLoss
          ? 'analytics-sparkline-bar-loss'
          : 'analytics-sparkline-bar-flat';
        return (
          <span
            key={idx}
            className={cls}
            style={{ height: `${Math.max(12, heightPct * 0.85)}%` }}
          />
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    from: daysAgoIso(30),
    to: todayIso(),
    symbol: 'ALL',
    strategy: 'ALL',
    search: '',
  });

  const { loading, error, tickets } = useTicketsHistory({
    from: filters.from,
    to: filters.to,
    symbol: filters.symbol !== 'ALL' ? filters.symbol : undefined,
    strategy: filters.strategy !== 'ALL' ? filters.strategy : undefined,
    status: undefined,
    scope: 'all',
  });

  const analyticsTickets = useMemo<AnalyticsTicket[]>(
    () => tickets.map(mapToAnalyticsTicket),
    [tickets],
  );

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return analyticsTickets.filter((t) => {
      if (filters.symbol !== 'ALL' && t.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && t.strategy !== filters.strategy) return false;

      if (search) {
        const haystack = [
          t.symbol,
          t.strategy,
          t.side,
          safeString(t.raw?.status),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [analyticsTickets, filters]);

  const strategyStats = useMemo<StrategyStats[]>(() => {
    const map = new Map<string, StrategyStats>();

    filtered.forEach((t) => {
      const id = t.strategy || '—';
      if (!map.has(id)) {
        map.set(id, {
          strategy: id,
          trades: 0,
          wins: 0,
          losses: 0,
          flat: 0,
          pnlDollars: 0,
          pnlR: 0,
          avgR: null,
          winRate: null,
        });
      }
      const entry = map.get(id)!;
      entry.trades += 1;

      if (t.pnlDollars != null) {
        entry.pnlDollars += t.pnlDollars;
        if (t.pnlDollars > 0) entry.wins += 1;
        else if (t.pnlDollars < 0) entry.losses += 1;
        else entry.flat += 1;
      }

      if (t.pnlR != null) {
        entry.pnlR += t.pnlR;
      }
    });

    Array.from(map.values()).forEach((entry) => {
      if (entry.trades > 0) {
        const decided = entry.wins + entry.losses;
        entry.avgR = entry.trades ? entry.pnlR / entry.trades : null;
        entry.winRate = decided ? (entry.wins / decided) * 100 : null;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.pnlDollars - a.pnlDollars);
  }, [filtered]);

  const hasData = filtered.length > 0;
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const selectedStats = useMemo<StrategyStats | null>(() => {
    if (!strategyStats.length) return null;
    const key = selectedStrategy ?? strategyStats[0].strategy;
    const found = strategyStats.find((s) => s.strategy === key);
    return found ?? strategyStats[0];
  }, [strategyStats, selectedStrategy]);

  const selectedTickets = useMemo(() => {
    if (!selectedStats) return [];
    return filtered.filter((t) => t.strategy === selectedStats.strategy);
  }, [filtered, selectedStats]);

  // Synthetic sparkline values: sequence of PnL dollars for the selected strategy
  const sparklineValues = useMemo(() => {
    return selectedTickets.map((t) => t.pnlDollars ?? 0);
  }, [selectedTickets]);

  const distinctSymbols = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const sym = safeString(row.symbol ?? row.canonicalApproved?.symbol ?? '');
      if (sym) set.add(sym);
    });
    return Array.from(set);
  }, [tickets]);

  const distinctStrategies = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const sid =
        row.strategy ??
        row.strategyId ??
        row.canonicalApproved?.strategyId ??
        '';
      if (sid) set.add(String(sid));
    });
    return Array.from(set);
  }, [tickets]);

  const withSafeLabel = (value: string) =>
    value === 'ALL' ? value : { label: `${value}\u200B`, value };

  return (
    <section className="analytics-v2-root space-y-5">
      {/* A3 header – aligned with Worklist & Tickets */}
      <header className="analytics-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Analytics
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              PnL and drift analytics derived from the canonical ticket audit feed.
              Surfaces where the engine is adding value, bleeding edge, or drifting
              versus expectations.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <Badge tone="blue">Derived from /api/tickets</Badge>
            <Badge tone="gray">
              Window · {filters.from} → {filters.to}
            </Badge>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="analytics-v2-filters">
        <FiltersBar
          dateRange={{
            from: filters.from,
            to: filters.to,
            onChange: (from, to) =>
              setFilters((prev) => ({
                ...prev,
                from: from ?? prev.from,
                to: to ?? prev.to,
              })),
          }}
          selects={[
            {
              label: 'Symbol',
              value: filters.symbol,
              options: ['ALL', ...distinctSymbols].map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, symbol: value })),
            },
            {
              label: 'Strategy',
              value: filters.strategy,
              options: ['ALL', ...distinctStrategies].map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, strategy: value })),
            },
          ]}
          extra={
            <div className="analytics-search-pill">
              <span className="analytics-search-icon">🔍</span>
              <input
                placeholder="Search symbol, strategy, status…"
                className="analytics-search-input"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          }
        />
      </div>

      {/* Main cockpit layout */}
      <div className="analytics-v2-layout">
        {/* Left – strategy analytics panel */}
        <div className="panel analytics-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Strategy PnL · Derived Analytics
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                {hasData ? `${strategyStats.length} Strategies` : 'No Data'}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-400">
              <span>{filtered.length} tickets in window</span>
              <span>Selection drives Strategy Details panel.</span>
            </div>
          </div>

          <div className="panel-body">
            {loading && (
              <div className="analytics-v2-status-line">
                Loading analytics from ticket history…
              </div>
            )}

            {!loading && error && (
              <div className="analytics-v2-status-line analytics-v2-status-error">
                Error loading analytics: {error}
              </div>
            )}

            {!loading && !error && !hasData && (
              <div className="analytics-v2-status-line">
                No tickets available for the current analytics window.
              </div>
            )}

            {!loading && !error && hasData && (
              <>
                {/* Strategy-level table */}
                <div className="analytics-v2-table dashboard-table-wrapper">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th className="text-left">Strategy</th>
                        <th className="text-right">Trades</th>
                        <th className="text-right">Win %</th>
                        <th className="text-right">PnL ($)</th>
                        <th className="text-right">PnL (R)</th>
                        <th className="text-right">Avg R</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyStats.map((s) => {
                        const isActive =
                          (selectedStats && selectedStats.strategy === s.strategy) ||
                          (!selectedStats && strategyStats[0]?.strategy === s.strategy);
                        const winRate =
                          s.winRate == null ? '—' : `${s.winRate.toFixed(0)}%`;
                        const pnlR =
                          Math.abs(s.pnlR) < 0.01 ? '0.0' : s.pnlR.toFixed(1);
                        const avgR =
                          s.avgR == null
                            ? '—'
                            : Math.abs(s.avgR) < 0.01
                            ? '0.0'
                            : s.avgR.toFixed(2);

                        return (
                          <tr
                            key={s.strategy || '—'}
                            onClick={() => setSelectedStrategy(s.strategy)}
                            className={
                              isActive
                                ? 'analytics-row analytics-row-active'
                                : 'analytics-row'
                            }
                          >
                            <td className="analytics-cell-primary">
                              {s.strategy || '—'}
                            </td>
                            <td className="analytics-cell-mono text-right">
                              {s.trades}
                            </td>
                            <td className="analytics-cell-mono text-right">
                              {winRate}
                            </td>
                            <td className="analytics-cell-mono text-right">
                              {fmtPrice(s.pnlDollars)}
                            </td>
                            <td className="analytics-cell-mono text-right">
                              {pnlR}
                            </td>
                            <td className="analytics-cell-mono text-right">
                              {avgR}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Strategy sparkline */}
                {selectedStats && (
                  <div className="analytics-v2-sparkline-card">
                    <div className="analytics-v2-sparkline-header">
                      <span className="analytics-v2-sparkline-label">
                        {selectedStats.strategy || '—'}
                      </span>
                      <span className="analytics-v2-sparkline-sub">
                        {selectedStats.trades} trades · PnL{' '}
                        {fmtPrice(selectedStats.pnlDollars)} · Avg R{' '}
                        {selectedStats.avgR == null
                          ? '—'
                          : selectedStats.avgR.toFixed(2)}
                      </span>
                    </div>
                    <AnalyticsSparkline values={sparklineValues} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right – details panel */}
        <aside className="panel analytics-v2-details w-full max-w-[380px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Strategy Details
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              {selectedStats
                ? 'Select another row to inspect its PnL and win/loss profile.'
                : 'Select a strategy from the table to see its PnL profile.'}
            </span>
          </div>

          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            {!selectedStats && (
              <div className="analytics-v2-placeholder">
                Select a strategy from the Analytics table to see its PnL,
                win/loss breakdown and basic drift profile.
              </div>
            )}

            {selectedStats && (
              <div className="space-y-4">
                <section className="details-section">
                  <h3 className="details-label">Headline</h3>
                  <div className="mt-2 space-y-1 text-sm text-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.8rem] text-slate-100">
                        {selectedStats.strategy || '—'}
                      </span>
                      <Badge tone={selectedStats.pnlDollars >= 0 ? 'green' : 'red'}>
                        {selectedStats.pnlDollars >= 0 ? 'Net Positive' : 'Net Negative'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      {selectedStats.trades} tickets ·{' '}
                      {selectedStats.winRate == null
                        ? 'no decided outcomes yet'
                        : `${selectedStats.winRate.toFixed(0)}% win rate`} · total{' '}
                      {fmtPrice(selectedStats.pnlDollars)} · PnL (R){' '}
                      {selectedStats.pnlR.toFixed(1)}.
                    </p>
                  </div>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Distribution</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-xs text-slate-400">Trades</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedStats.trades}
                    </div>
                    <div className="text-xs text-slate-400">Wins</div>
                    <div className="font-mono text-[0.8rem] text-emerald-300">
                      {selectedStats.wins}
                    </div>
                    <div className="text-xs text-slate-400">Losses</div>
                    <div className="font-mono text-[0.8rem] text-rose-300">
                      {selectedStats.losses}
                    </div>
                    <div className="text-xs text-slate-400">Flat</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedStats.flat}
                    </div>
                    <div className="text-xs text-slate-400">Win rate</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedStats.winRate == null
                        ? '—'
                        : `${selectedStats.winRate.toFixed(1)}%`}
                    </div>
                    <div className="text-xs text-slate-400">Avg R per trade</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedStats.avgR == null
                        ? '—'
                        : selectedStats.avgR.toFixed(2)}
                    </div>
                  </div>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Recent Tickets (PnL trail)</h3>
                  <div className="mt-2 space-y-1 text-[0.78rem] text-slate-200">
                    {selectedTickets.slice(-8).map((t) => (
                      <div
                        key={t.key}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="font-mono text-[0.75rem] text-slate-400">
                          {t.openedDate} · {t.symbol} · {t.side}
                        </span>
                        <span
                          className={
                            t.pnlDollars == null
                              ? 'font-mono text-[0.75rem] text-slate-400'
                              : t.pnlDollars >= 0
                              ? 'font-mono text-[0.75rem] text-emerald-300'
                              : 'font-mono text-[0.75rem] text-rose-300'
                          }
                        >
                          {t.pnlDollars == null ? '—' : fmtPrice(t.pnlDollars)}
                        </span>
                      </div>
                    ))}
                    {selectedTickets.length === 0 && (
                      <p className="text-[0.75rem] text-slate-500">
                        No tickets recorded for this strategy within the current window.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

