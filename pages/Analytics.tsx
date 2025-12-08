// apps/dashboard/src/pages/Analytics.tsx

import React, { useEffect, useMemo, useState } from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';
import {
  fetchAnalyticsCanonicalTickets,
} from '../lib/api';

type TimePreset = 'TODAY' | 'WEEK' | '30D';

type Filters = {
  preset: TimePreset;
  symbol: string;
  strategy: string;
};

type KpiSummary = {
  totalPnL: number;
  winRate: number;
  avgRMultiple: number;
  tradeCount: number;
};

function toDateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(preset: TimePreset): { from: string; to: string } {
  const now = new Date();
  const end = toDateOnlyIso(now);

  if (preset === 'TODAY') {
    return { from: end, to: end };
  }

  if (preset === 'WEEK') {
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
    return { from: toDateOnlyIso(fromDate), to: end };
  }

  // 30D default
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: toDateOnlyIso(fromDate), to: end };
}

function computeKpis(tickets: CanonicalTicket[]): KpiSummary {
  if (!tickets.length) {
    return {
      totalPnL: 0,
      winRate: 0,
      avgRMultiple: 0,
      tradeCount: 0,
    };
  }

  let totalPnL = 0;
  let sumR = 0;
  let countedR = 0;
  let wins = 0;

  for (const t of tickets) {
    const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
    const r = typeof t.pnlRMultiple === 'number' ? t.pnlRMultiple : null;

    totalPnL += pnl;

    if (r !== null) {
      sumR += r;
      countedR += 1;
      if (r > 0) wins += 1;
    }
  }

  const tradeCount = tickets.length;
  const avgRMultiple = countedR ? sumR / countedR : 0;
  const winRate = countedR ? (wins / countedR) * 100 : 0;

  return {
    totalPnL,
    winRate,
    avgRMultiple,
    tradeCount,
  };
}

const AnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    preset: '30D',
    symbol: 'ALL',
    strategy: 'ALL',
  });

  const [tickets, setTickets] = useState<CanonicalTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { from, to } = getDateRange(filters.preset);

      try {
        const data = await fetchAnalyticsCanonicalTickets({
          from,
          to,
          symbol: filters.symbol !== 'ALL' ? filters.symbol : undefined,
          strategy: filters.strategy !== 'ALL' ? filters.strategy : undefined,
          limit: 400,
        });

        if (cancelled) return;

        setTickets(data);
        setSelectedId(data.length ? String(data[0].id) : null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load analytics');
        setTickets([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const kpis = useMemo(() => computeKpis(tickets), [tickets]);

  const selectedTicket: CanonicalTicket | null = useMemo(() => {
    if (!selectedId) return null;
    return tickets.find((t) => String(t.id) === String(selectedId)) ?? null;
  }, [tickets, selectedId]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as TimePreset;
    setFilters((prev) => ({ ...prev, preset }));
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const symbol = e.target.value;
    setFilters((prev) => ({ ...prev, symbol }));
  };

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategy = e.target.value;
    setFilters((prev) => ({ ...prev, strategy }));
  };

  const handleRowClick = (ticketId: string | number) => {
    setSelectedId(String(ticketId));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100">
              Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Performance and drift analytics over canonical tickets.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <span
              data-testid="badge"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-200"
            >
              Read-only analytics
            </span>
            <span
              data-testid="badge"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-400"
            >
              Backed by /api/tickets (analytics feed)
            </span>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <div data-testid="card" className="rounded-xl border border-slate-800 bg-slate-950">
        <div data-testid="card-body" className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              value={filters.preset}
              onChange={handlePresetChange}
            >
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 days</option>
              <option value="30D">Last 30 days</option>
            </select>

            <select
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              value={filters.symbol}
              onChange={handleSymbolChange}
            >
              <option value="ALL">ALL symbols</option>
              <option value="ES">ES</option>
              <option value="NQ">NQ</option>
              <option value="CL">CL</option>
              <option value="YM">YM</option>
            </select>

            <select
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              value={filters.strategy}
              onChange={handleStrategyChange}
            >
              <option value="ALL">ALL strategies</option>
              <option value="ORR">ORR</option>
              <option value="OSB">OSB</option>
              <option value="VWAP-FT">VWAP-FT</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div data-testid="kpi" className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-400">Total PnL</div>
          <div className="text-lg font-semibold text-slate-100">
            {kpis.totalPnL.toFixed(2)}
          </div>
        </div>
        <div data-testid="kpi" className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-400">Win rate</div>
          <div className="text-lg font-semibold text-slate-100">
            {kpis.winRate.toFixed(1)}%
          </div>
        </div>
        <div data-testid="kpi" className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-400">Avg R multiple</div>
          <div className="text-lg font-semibold text-slate-100">
            {kpis.avgRMultiple.toFixed(2)}
          </div>
        </div>
        <div data-testid="kpi" className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="text-xs text-slate-400">Trades</div>
          <div className="text-lg font-semibold text-slate-100">
            {kpis.tradeCount}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* TABLE */}
        <div className="flex-1 min-w-0" data-testid="card">
          <div data-testid="card-body" className="p-3">
            {loading && (
              <div className="text-xs text-slate-400">Loading analytics…</div>
            )}
            {error && !loading && (
              <div className="text-xs text-red-400">
                {error}
              </div>
            )}
            {!loading && !error && tickets.length === 0 && (
              <div className="text-xs text-slate-400">
                No trades found for the selected window and filters.
              </div>
            )}
            {!loading && !error && tickets.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="dashboard-table min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Symbol</th>
                      <th className="px-3 py-2">Strategy</th>
                      <th className="px-3 py-2">Side</th>
                      <th className="px-3 py-2 text-right">Entry</th>
                      <th className="px-3 py-2 text-right">Exit</th>
                      <th className="px-3 py-2 text-right">PnL</th>
                      <th className="px-3 py-2 text-right">R multiple</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={String(t.id)}
                        className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-900/70 ${
                          String(t.id) === String(selectedId)
                            ? 'bg-slate-900/80'
                            : 'bg-slate-950'
                        }`}
                        onClick={() => handleRowClick(t.id)}
                      >
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {t.sessionDateUtc ?? t.createdAtUtc ?? ''}
                        </td>
                        <td className="px-3 py-2">{t.symbol}</td>
                        <td className="px-3 py-2">{t.strategyId ?? ''}</td>
                        <td className="px-3 py-2">{t.side}</td>
                        <td className="px-3 py-2 text-right">
                          {t.entryPrice?.toFixed(2) ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof t.exitPrice === 'number'
                            ? t.exitPrice.toFixed(2)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof t.pnl === 'number'
                            ? t.pnl.toFixed(2)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {typeof t.pnlRMultiple === 'number'
                            ? t.pnlRMultiple.toFixed(2)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {t.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div className="w-full max-w-md shrink-0" data-testid="card">
          <div data-testid="card-body" className="p-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Trade details
            </h2>
            {!selectedTicket && (
              <div className="mt-3 text-xs text-slate-400">
                Select a trade from the table to see details.
              </div>
            )}
            {selectedTicket && (
              <div className="mt-3 space-y-4 text-xs text-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.8rem]">
                    {selectedTicket.id}
                  </span>
                  <span
                    data-testid="badge"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-100"
                  >
                    Symbol {selectedTicket.symbol}
                  </span>
                  {selectedTicket.strategyId && (
                    <span
                      data-testid="badge"
                      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-300"
                    >
                      Strategy {selectedTicket.strategyId}
                    </span>
                  )}
                  <span
                    data-testid="badge"
                    className="inline-flex items-center rounded-full border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[0.7rem] text-emerald-200"
                  >
                    {selectedTicket.side}
                  </span>
                  {typeof selectedTicket.pnlRMultiple === 'number' && (
                    <span
                      data-testid="badge"
                      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-200"
                    >
                      {selectedTicket.pnlRMultiple.toFixed(2)}R
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">Entry</div>
                    <div className="font-mono">
                      {selectedTicket.entryPrice?.toFixed(2) ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Exit</div>
                    <div className="font-mono">
                      {typeof selectedTicket.exitPrice === 'number'
                        ? selectedTicket.exitPrice.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Risk (per contract)</div>
                    <div className="font-mono">
                      {selectedTicket.perContractRisk?.toFixed(2) ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Expected reward</div>
                    <div className="font-mono">
                      {selectedTicket.expectedReward?.toFixed(2) ?? '—'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">Total risk</div>
                    <div className="font-mono">
                      {selectedTicket.totalRisk?.toFixed(2) ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Realized PnL</div>
                    <div className="font-mono">
                      {typeof selectedTicket.pnl === 'number'
                        ? selectedTicket.pnl.toFixed(2)
                        : '—'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                  <p>
                    This panel tells the truth directly from canonical tickets.
                    Any routing, sizing, or guardrail changes must go through
                    engine/back-office configuration, not this dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

