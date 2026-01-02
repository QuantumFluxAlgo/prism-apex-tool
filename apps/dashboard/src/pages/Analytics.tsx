// @ts-nocheck
/* PRISM APEX – Analytics V2 A3 Cockpit
 *
 * Goals:
 * - Surface realised PnL, drawdown and R-multiples by session/symbol/strategy.
 * - Make it obvious whether the engine + operator are printing money or bleeding.
 * - Powered entirely by canonical tickets via /api/tickets.
 */

import React, { useEffect, useMemo, useState } from "react";
import type { CanonicalTicket } from "@prism-apex/shared";
import { Card, CardBody } from "../ui/Card";
import Kpi from "../ui/Kpi";
import Badge from "../ui/Badge";
import FiltersBar from "../ui/FiltersBar";
import DataTable from "../ui/DataTable";
import Button from "../ui/Button";
import { fetchTickets, buildCanonicalTicketFromRow } from "../lib/api";
import { logContractError, logPageLoad } from "../lib/contractTelemetry";

const RANGE_DAYS = 10;

const STRATEGY_LABELS: Record<string, string> = {
  ORR: "Opening Range Reversal",
  OSB: "Opening-Session Breakout",
  "VWAP-FT": "VWAP First-Touch",
};

function formatStrategyLabel(code: string | undefined | null) {
  if (!code) return "Unknown strategy";
  return STRATEGY_LABELS[code] ?? code;
}

type AnalyticsRow = {
  id: string;
  sessionDate: string;
  symbol: string;
  strategy: string;
  realizedPnl: number;
  maxDrawdown: number;
  trades: number;
  winRate: number;
  avgRMultiple: number;
};

type AnalyticsFilters = {
  symbol: string;
  strategy: string;
  search: string;
};

const INITIAL_FILTERS: AnalyticsFilters = {
  symbol: "ALL",
  strategy: "ALL",
  search: "",
};

function computeRange(days: number): { from: string; to: string } {
  const now = Date.now();
  const end = new Date(now);
  const start = new Date(now - days * 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

type Bucket = {
  sessionDate: string;
  symbol: string;
  strategy: string;
  trades: number;
  wins: number;
  realizedPnl: number;
  pnlSeries: Array<{ ts: string; pnl: number }>;
  rMultipleSum: number;
  rMultipleCount: number;
};

function aggregateTickets(tickets: CanonicalTicket[]): AnalyticsRow[] {
  const buckets = new Map<string, Bucket>();

  for (const t of tickets) {
    const sessionDate = (t.sessionDateUtc ?? t.createdAtUtc ?? "").slice(0, 10) || "Unknown";
    const symbol = t.symbol ?? "UNKNOWN";
    const strategy = t.strategyId ?? "UNKNOWN";
    const key = `${sessionDate}|${symbol}|${strategy}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        sessionDate,
        symbol,
        strategy,
        trades: 0,
        wins: 0,
        realizedPnl: 0,
        pnlSeries: [],
        rMultipleSum: 0,
        rMultipleCount: 0,
      });
    }

    const bucket = buckets.get(key)!;
    const pnl = typeof t.pnl === "number" ? t.pnl : 0;
    bucket.trades += 1;
    bucket.realizedPnl += pnl;
    if (pnl > 0) bucket.wins += 1;
    bucket.pnlSeries.push({
      ts: t.completedAtUtc ?? t.updatedAtUtc ?? t.createdAtUtc ?? sessionDate,
      pnl,
    });
    if (typeof t.pnlRMultiple === "number" && Number.isFinite(t.pnlRMultiple)) {
      bucket.rMultipleSum += t.pnlRMultiple;
      bucket.rMultipleCount += 1;
    }
  }

  const rows: AnalyticsRow[] = [];

  for (const [key, bucket] of buckets.entries()) {
    const sorted = bucket.pnlSeries.sort((a, b) => (a.ts ?? "").localeCompare(b.ts ?? ""));
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    for (const point of sorted) {
      equity += point.pnl;
      if (equity > peak) peak = equity;
      const dd = equity - peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    rows.push({
      id: key,
      sessionDate: bucket.sessionDate,
      symbol: bucket.symbol,
      strategy: bucket.strategy,
      realizedPnl: Number(bucket.realizedPnl.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      trades: bucket.trades,
      winRate: bucket.trades ? Math.round((bucket.wins / bucket.trades) * 100) : 0,
      avgRMultiple: bucket.rMultipleCount
        ? Number((bucket.rMultipleSum / bucket.rMultipleCount).toFixed(2))
        : 0,
    });
  }

  return rows.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

export default function Analytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [selected, setSelected] = useState<AnalyticsRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    logPageLoad("Analytics");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { from, to } = computeRange(RANGE_DAYS);
        const { rows: ticketRows = [] } = await fetchTickets({
          from,
          to,
          status: "ALL",
          scope: "all",
          limit: 1000,
        });
        const canonical = ticketRows
          .map((row) => buildCanonicalTicketFromRow(row))
          .filter((ticket): ticket is CanonicalTicket => Boolean(ticket));
        if (!canonical.length) {
          throw new Error(
            "Failed to load analytics history: No ticket history available in selected range",
          );
        }
        const aggregated = aggregateTickets(canonical);
        if (!cancelled) {
          setRows(aggregated);
          setSelected(aggregated[0] ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load analytics history.");
          setRows([]);
          setSelected(null);
          logContractError({
            pageId: "Analytics",
            endpoint: "/api/tickets",
            error: err,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const symbols = useMemo(
    () => Array.from(new Set(rows.map((r) => r.symbol))).sort(),
    [rows]
  );
  const strategies = useMemo(
    () => Array.from(new Set(rows.map((r) => r.strategy))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = rows;

    if (filters.symbol !== "ALL") {
      result = result.filter((r) => r.symbol === filters.symbol);
    }
    if (filters.strategy !== "ALL") {
      result = result.filter((r) => r.strategy === filters.strategy);
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((r) => {
        const haystack = [r.sessionDate, r.symbol, r.strategy, r.id]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [rows, filters]);

  const isEmpty = !loading && !error && filtered.length === 0;

  const totalSessions = filtered.length;
  const netRealized = filtered.reduce((acc, r) => acc + r.realizedPnl, 0);
  const maxDrawdown = filtered.reduce((acc, r) => Math.min(acc, r.maxDrawdown), 0);
  const avgWinRate =
    filtered.length === 0
      ? 0
      : Math.round(
          filtered.reduce((acc, r) => acc + r.winRate, 0) / filtered.length,
        );
  const bestSession =
    filtered.length === 0
      ? null
      : [...filtered].sort((a, b) => b.realizedPnl - a.realizedPnl)[0];

  const columns = [
    {
      key: "session",
      header: "Session",
      render: (_: any, row: AnalyticsRow) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[0.75rem] text-slate-200">
            {row.sessionDate}
          </span>
          <span className="text-[0.65rem] text-slate-500">{row.symbol}</span>
        </div>
      ),
    },
    {
      key: "strategy",
      header: "Strategy",
      cellClassName: "text-[0.75rem]",
    },
    {
      key: "trades",
      header: "Trades",
      cellClassName: "text-right font-mono text-[0.75rem]",
    },
    {
      key: "realizedPnl",
      header: "Realized PnL",
      cellClassName: "text-right font-mono text-[0.75rem]",
      render: (_: any, row: AnalyticsRow) => {
        const tone =
          row.realizedPnl > 0
            ? "text-emerald-300"
            : row.realizedPnl < 0
            ? "text-rose-300"
            : "text-slate-300";
        const sign = row.realizedPnl > 0 ? "+" : "";
        return (
          <span className={tone}>
            {sign}
            {row.realizedPnl.toFixed(0)}
          </span>
        );
      },
    },
    {
      key: "maxDrawdown",
      header: "Max DD",
      cellClassName: "text-right font-mono text-[0.75rem]",
    },
    {
      key: "winRate",
      header: "Win %",
      cellClassName: "text-right font-mono text-[0.75rem]",
      render: (_: any, row: AnalyticsRow) => <span>{row.winRate.toFixed(0)}%</span>,
    },
    {
      key: "avgRMultiple",
      header: "Avg R",
      cellClassName: "text-right font-mono text-[0.75rem]",
      render: (_: any, row: AnalyticsRow) => (
        <span>
          {row.avgRMultiple > 0 ? "+" : ""}
          {row.avgRMultiple.toFixed(2)}
        </span>
      ),
    },
  ];

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleRowClick = (row: AnalyticsRow) => {
    setSelected(row);
  };

  return (
    <div className="a3-page-root">
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Performance cockpit</div>
          <h1>Analytics – Canonical tickets</h1>
          <p>Sessions, realised PnL, and R-multiples sourced from /api/tickets.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="a3-page-header-meta">
            <Badge tone="blue" size="xs">
              Analytics feed
            </Badge>
            <Badge tone="gray" size="xs">
              Tickets-only
            </Badge>
          </div>
          <Button size="xs" tone="ghost" onClick={() => setRefreshToken((c) => c + 1)}>
            Refresh
          </Button>
        </div>
      </header>

      <section className="a3-page-main-card">
        <FiltersBar />
        <div className="a3-page-kpi-strip">
          <Kpi label="Sessions" value={totalSessions} tone="indigo" sublabel={`last ${RANGE_DAYS} days`} />
          <Kpi
            label="Net realized"
            value={netRealized.toFixed(0)}
            tone={netRealized >= 0 ? "emerald" : "rose"}
            sublabel="USD"
          />
          <Kpi
            label="Best session"
            value={bestSession ? `#${bestSession.sessionDate}` : "—"}
            tone="emerald"
            sublabel={bestSession ? formatStrategyLabel(bestSession.strategy) : "No standout"}
          />
          <Kpi label="Avg win %" value={`${avgWinRate}%`} tone="amber" sublabel="per session" />
        </div>

        <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(260px,0.9fr)] gap-3">
        <Card className="a3-page-table-card min-h-[420px]">
          <CardBody className="flex flex-col h-full">
            <div className="a3-table-headline">
              <div className="a3-page-section-label">Sessions</div>
              {(loading || error) && (
                <div className="text-[0.7rem] text-slate-300">
                  {loading && <span>Loading analytics…</span>}
                  {!loading && error && <span>{error}</span>}
                </div>
              )}
            </div>

            <div className="a3-page-table-scroll a3-scroll-soft min-h-[320px]">
              {isEmpty ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">
                  Failed to load analytics history. No ticket history in the selected range.
                </div>
              ) : (
                <DataTable
                  rows={filtered}
                  columns={columns}
                  keyField="id"
                  size="compact"
                  onRowClick={handleRowClick}
                  selectedRowKey={selected?.id ?? null}
                />
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="a3-page-side-panel min-h-[420px]">
          <CardBody className="flex flex-col h-full gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="a3-page-section-label">Session detail</div>
                <div className="text-sm font-semibold text-slate-50">
                  {selected
                    ? `${selected.sessionDate} · ${formatStrategyLabel(selected.strategy)}`
                    : "No session selected"}
                </div>
              </div>
            </div>

            {selected ? (
              <div className="flex flex-col gap-3 text-[0.75rem] text-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[0.65rem] text-slate-500 mb-0.5">Trades</div>
                    <div className="font-mono">
                      {selected.trades} trades
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-slate-500 mb-0.5">Win rate</div>
                    <div className="font-mono">{selected.winRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-slate-500 mb-0.5">Realized PnL</div>
                    <div className="font-mono">
                      {selected.realizedPnl > 0 ? "+" : ""}
                      {selected.realizedPnl.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-slate-500 mb-0.5">Max drawdown</div>
                    <div className="font-mono">{selected.maxDrawdown.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-slate-500 mb-0.5">Avg R-multiple</div>
                    <div className="font-mono">
                      {selected.avgRMultiple > 0 ? "+" : ""}
                      {selected.avgRMultiple.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[0.7rem]">
                  <div className="mb-1 uppercase tracking-[0.18em] text-slate-500 text-[0.65rem]">
                    Strategy badge
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="blue">{formatStrategyLabel(selected.strategy)}</Badge>
                    <Badge tone="gray">{selected.symbol}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[0.75rem] text-slate-500">
                Select a session to inspect drawdown and trade mix.
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      </section>
    </div>
  );
}
