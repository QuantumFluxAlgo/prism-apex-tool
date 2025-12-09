// @ts-nocheck
/* PRISM APEX – Analytics V2 A3 Cockpit
 *
 * Goals:
 * - Surface realised PnL, drawdown and R-multiples by session/symbol/strategy.
 * - Make it obvious whether the engine + operator are printing money or bleeding.
 * - Engine-backed via /api/analytics when available, with safe mock fallback.
 *
 * Layout:
 * - Header
 * - Filters strip
 * - KPI strip
 * - Main table
 * - Right-hand details panel
 */

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../ui/Card";
import Kpi from "../ui/Kpi";
import Badge from "../ui/Badge";
import Tooltip from "../ui/Tooltip";
import FiltersBar from "../ui/FiltersBar";
import DataTable from "../ui/DataTable";
import Button from "../ui/Button";

type AnalyticsRow = {
  id: string;
  sessionDate: string; // YYYY-MM-DD
  symbol: string;
  strategy: string;
  realizedPnl: number; // dollars or ticks – interpretation is backend-specific
  unrealizedPnl: number;
  maxDrawdown: number;
  trades: number;
  winRate: number; // 0–100
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

const MOCK_ANALYTICS_ROWS: AnalyticsRow[] = [
  {
    id: "a-es-orr-2025-12-08",
    sessionDate: "2025-12-08",
    symbol: "ES",
    strategy: "ORR",
    realizedPnl: 850,
    unrealizedPnl: 0,
    maxDrawdown: -220,
    trades: 7,
    winRate: 71,
    avgRMultiple: 1.8,
  },
  {
    id: "a-nq-vwap-2025-12-08",
    sessionDate: "2025-12-08",
    symbol: "NQ",
    strategy: "VWAP-FT",
    realizedPnl: -320,
    unrealizedPnl: 0,
    maxDrawdown: -480,
    trades: 5,
    winRate: 40,
    avgRMultiple: -0.4,
  },
  {
    id: "a-cl-osb-2025-12-08",
    sessionDate: "2025-12-08",
    symbol: "CL",
    strategy: "OSB",
    realizedPnl: 120,
    unrealizedPnl: 30,
    maxDrawdown: -150,
    trades: 4,
    winRate: 50,
    avgRMultiple: 0.6,
  },
];

function mapApiRowToAnalytics(row: any): AnalyticsRow {
  return {
    id: String(row.id ?? `${row.symbol}-${row.strategy}-${row.sessionDate ?? ""}`),
    sessionDate: String(row.sessionDate ?? row.session_date ?? "").slice(0, 10),
    symbol: String(row.symbol ?? "ES"),
    strategy: String(row.strategy ?? row.strategyId ?? "ORR"),
    realizedPnl: Number(
      row.realizedPnl ??
        row.realisedPnl ??
        row.pnlRealized ??
        row.realized_pnl ??
        0
    ),
    unrealizedPnl: Number(
      row.unrealizedPnl ??
        row.unrealisedPnl ??
        row.pnlUnrealized ??
        row.unrealized_pnl ??
        0
    ),
    maxDrawdown: Number(row.maxDrawdown ?? row.max_drawdown ?? 0),
    trades: Number(row.trades ?? row.tradeCount ?? 0),
    winRate: Number(row.winRate ?? row.win_rate ?? 0),
    avgRMultiple: Number(row.avgRMultiple ?? row.avg_r_multiple ?? 0),
  };
}

export default function Analytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS);
  const [rows, setRows] = useState<AnalyticsRow[]>(MOCK_ANALYTICS_ROWS);
  const [selected, setSelected] = useState<AnalyticsRow | null>(
    MOCK_ANALYTICS_ROWS[0]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (typeof fetch !== "function") {
          throw new Error("fetch not available; using mock analytics.");
        }

        const res = await fetch("/api/analytics");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: any = await res.json();
        const raw = Array.isArray(json?.rows)
          ? json.rows
          : Array.isArray(json?.sessions)
          ? json.sessions
          : Array.isArray(json)
          ? json
          : [];

        if (!Array.isArray(raw) || raw.length === 0) {
          throw new Error("Empty analytics payload; using mock.");
        }

        const mapped = raw.map(mapApiRowToAnalytics);
        if (!cancelled) {
          setRows(mapped);
          setSelected(mapped[0] ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unknown error");
          setRows(MOCK_ANALYTICS_ROWS);
          setSelected(MOCK_ANALYTICS_ROWS[0]);
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
  }, []);

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
        return (
          r.sessionDate.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          r.strategy.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [rows, filters]);

  const isEmpty = !loading && !error && filtered.length === 0;

  // --- KPI strip -------------------------------------------------------------

  const totalSessions = filtered.length;

  const netRealized = filtered.reduce(
    (acc, r) => acc + (Number.isFinite(r.realizedPnl) ? r.realizedPnl : 0),
    0
  );

  const maxDrawdown =
    filtered.length === 0
      ? 0
      : filtered.reduce(
          (acc, r) =>
            typeof r.maxDrawdown === "number"
              ? Math.min(acc, r.maxDrawdown)
              : acc,
          0
        );

  const avgWinRate =
    filtered.length === 0
      ? 0
      : (() => {
          const vals = filtered
            .map((r) => (Number.isFinite(r.winRate) ? r.winRate : null))
            .filter((v) => v !== null) as number[];
          if (!vals.length) return 0;
          const sum = vals.reduce((acc, v) => acc + v, 0);
          return Math.round(sum / vals.length);
        })();

  const bestSession =
    filtered.length === 0
      ? null
      : [...filtered].sort((a, b) => b.realizedPnl - a.realizedPnl)[0];

  // --- Table config ----------------------------------------------------------

  const columns = [
    {
      key: "sessionDate",
      header: "Session",
      cellClassName: "font-mono text-[0.7rem] text-slate-300",
    },
    {
      key: "symbol",
      header: "Symbol",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "strategy",
      header: "Strategy",
      cellClassName: "text-xs",
    },
    {
      key: "realizedPnl",
      header: "Realized PnL",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => {
        const tone =
          row.realizedPnl > 0
            ? "text-emerald-300"
            : row.realizedPnl < 0
            ? "text-rose-300"
            : "text-slate-300";
        const sign = row.realizedPnl > 0 ? "+" : "";
        return (
          <span className={`font-mono ${tone}`}>
            {sign}
            {row.realizedPnl.toFixed(0)}
          </span>
        );
      },
    },
    {
      key: "unrealizedPnl",
      header: "Unrealized PnL",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => {
        const tone =
          row.unrealizedPnl > 0
            ? "text-emerald-300"
            : row.unrealizedPnl < 0
            ? "text-rose-300"
            : "text-slate-300";
        const sign = row.unrealizedPnl > 0 ? "+" : "";
        return (
          <span className={`font-mono ${tone}`}>
            {sign}
            {row.unrealizedPnl.toFixed(0)}
          </span>
        );
      },
    },
    {
      key: "maxDrawdown",
      header: "Max DD",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => (
        <span className="font-mono">{row.maxDrawdown.toFixed(0)}</span>
      ),
    },
    {
      key: "trades",
      header: "Trades",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => (
        <span className="font-mono">{row.trades}</span>
      ),
    },
    {
      key: "winRate",
      header: "Win %",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => (
        <span className="font-mono">{row.winRate.toFixed(0)}%</span>
      ),
    },
    {
      key: "avgRMultiple",
      header: "Avg R",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: AnalyticsRow) => (
        <span className="font-mono">
          {row.avgRMultiple > 0 ? "+" : ""}
          {row.avgRMultiple.toFixed(2)}
        </span>
      ),
    },
  ];

  const tableData = filtered;

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleRowClick = (row: AnalyticsRow) => {
    setSelected(row);
  };

  // --- Render ----------------------------------------------------------------

  return (
    <div className="analytics-v2-root flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Analytics</h1>
            <p className="text-xs text-slate-400">
              Session-level PnL, drawdown and R-multiples by symbol & strategy.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <span data-testid="badge" tone="blue">
              Live PnL analytics
            </span>
            <span data-testid="badge" tone="gray">
              Backed by /api/analytics (mock fallback if offline)
            </span>
          </div>
        </div>
        {(loading || error) && (
          <div className="mt-1 text-[0.7rem] text-slate-400">
            {loading && <span>Loading analytics from engine…</span>}
            {!loading && error && (
              <span>Engine analytics unavailable; using illustrative data.</span>
            )}
          </div>
        )}
      </header>

      {/* Filters */}
      <Card>
        <CardBody>
          <FiltersBar>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Symbol */}
              <select
                className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                value={filters.symbol}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, symbol: e.target.value }))
                }
              >
                <option value="ALL">ALL symbols</option>
                {symbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>

              {/* Strategy */}
              <select
                className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                value={filters.strategy}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, strategy: e.target.value }))
                }
              >
                <option value="ALL">ALL strategies</option>
                {strategies.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Search */}
              <input
                type="search"
                className="h-8 w-48 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                placeholder="Search session, symbol, strategy…"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
              />

              {/* Reset */}
              <Button size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>
          </FiltersBar>
        </CardBody>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Sessions"
          value={totalSessions}
          hint="Visible sessions after filters."
        />
        <Kpi
          label="Net realized"
          value={netRealized.toFixed(0)}
          hint="Aggregate realized PnL across visible sessions."
        />
        <Kpi
          label="Worst max DD"
          value={maxDrawdown.toFixed(0)}
          hint="Most negative max drawdown across visible sessions."
        />
        <Kpi
          label="Avg win rate"
          value={`${avgWinRate.toFixed(0)}%`}
          hint="Average win rate across visible sessions."
        />
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Table */}
        <Card className="flex-1 min-w-0">
          <CardBody>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <DataTable
                columns={columns}
                data={tableData}
                onRowClick={handleRowClick}
              />
              {isEmpty && (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  No analytics rows match the current filters.
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Details panel */}
        <Card className="w-full max-w-md shrink-0">
          <CardBody>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Session details
            </h2>

            {!selected && (
              <p className="mt-3 text-xs text-slate-400">
                Select a session row to see a breakdown.
              </p>
            )}

            {selected && (
              <div className="mt-3 space-y-3 text-xs text-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.8rem]">
                    {selected.sessionDate} · {selected.symbol}
                  </span>
                  <Badge tone="blue">{selected.strategy}</Badge>
                  <Badge tone={selected.realizedPnl >= 0 ? "green" : "red"}>
                    {selected.realizedPnl >= 0 ? "Profitable" : "Losing"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">Realized PnL</div>
                    <div className="font-mono">
                      {selected.realizedPnl > 0 ? "+" : ""}
                      {selected.realizedPnl.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Unrealized PnL</div>
                    <div className="font-mono">
                      {selected.unrealizedPnl > 0 ? "+" : ""}
                      {selected.unrealizedPnl.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Max drawdown</div>
                    <div className="font-mono">
                      {selected.maxDrawdown.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Trades</div>
                    <div className="font-mono">{selected.trades}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">Win rate</div>
                    <div className="font-mono">
                      {selected.winRate.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Avg R multiple</div>
                    <div className="font-mono">
                      {selected.avgRMultiple > 0 ? "+" : ""}
                      {selected.avgRMultiple.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                  <Tooltip content="Analytics is read-only and should match engine PnL; any discrepancies are engine/back-office concerns, not dashboard logic.">
                    <p>
                      This panel summarises the economic outcome of the
                      engine+operator decisions for the session. Any actual
                      corrections must go through the engine and back office,
                      not this dashboard.
                    </p>
                  </Tooltip>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

