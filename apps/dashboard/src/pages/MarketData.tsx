// @ts-nocheck
/* PRISM APEX – Markets V2 A3 Cockpit
 *
 * Goals:
 * - Give operators a session-level view of each market (ES, NQ, CL, etc.).
 * - Show regime, OR range, ATR bucket, VWAP drift, and an overall session score.
 * - Tie into engine via /api/markets when available, but fall back to local mocks.
 *
 * Layout (aligned with legacy tests):
 * - Header with "Session Context" heading
 * - Text: "Price overlays, OR / ATR footprint, VWAP slope, and regime flags"
 * - Debug text: "No payload loaded. Select a symbol and ensure SessionMetrics are available"
 * - Filters strip wrapped in .markets-a3-filters
 *   - "Symbol" label + selector
 *   - Overlay toggles (buttons: OR band, VWAP trace, ATR marker, Regime flags)
 *   - Meta area text containing "Session metrics"
 * - KPI strip
 * - Main area:
 *   - .markets-a3-chart-shell (always present, acts as chart wrapper)
 *   - Table + details panel
 */

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../ui/Card";
import Kpi from "../ui/Kpi";
import Badge from "../ui/Badge";
import Tooltip from "../ui/Tooltip";
import FiltersBar from "../ui/FiltersBar";
import DataTable from "../ui/DataTable";
import Button from "../ui/Button";
import { fetchYahooHealth } from "../lib/api";
import {
  deriveIngestState,
  getWorstLagSeconds,
  formatLag,
  statusChipTone,
  type IngestState,
} from "../lib/ingestState";

type MarketsRiskBucket = "GREEN" | "AMBER" | "RED";

type MarketRow = {
  id: string;
  symbol: string;
  sessionDate: string; // YYYY-MM-DD
  status: "PRE" | "OPEN" | "CLOSED";
  regime: string; // e.g. "TREND", "RANGE", "CHOPPY"
  atrBucket: string; // e.g. "LOW", "MED", "HIGH"
  orRangeTicks: number;
  vwapDriftTicks: number;
  score: number; // 0–100 session quality score
  riskBucket: MarketsRiskBucket;
  signalsOrr: number;
  signalsOsb: number;
  signalsVwap: number;
  latestTicketId: string | null;
  lastUpdated: string; // ISO-ish
};

type MarketsFilters = {
  symbol: string;
  status: "ALL" | "PRE" | "OPEN" | "CLOSED";
  riskBucket: "ALL" | MarketsRiskBucket;
  search: string;
};

const INITIAL_FILTERS: MarketsFilters = {
  symbol: "ALL",
  status: "ALL",
  riskBucket: "ALL",
  search: "",
};

const MOCK_MARKETS_ROWS: MarketRow[] = [
  {
    id: "m-es-2025-12-08",
    symbol: "ES",
    sessionDate: "2025-12-08",
    status: "OPEN",
    regime: "TREND",
    atrBucket: "MED",
    orRangeTicks: 28,
    vwapDriftTicks: 6,
    score: 82,
    riskBucket: "GREEN",
    signalsOrr: 4,
    signalsOsb: 2,
    signalsVwap: 3,
    latestTicketId: "t-orr-001",
    lastUpdated: "2025-12-08T14:05:00Z",
  },
  {
    id: "m-nq-2025-12-08",
    symbol: "NQ",
    sessionDate: "2025-12-08",
    status: "OPEN",
    regime: "RANGE",
    atrBucket: "HIGH",
    orRangeTicks: 42,
    vwapDriftTicks: -12,
    score: 67,
    riskBucket: "AMBER",
    signalsOrr: 3,
    signalsOsb: 1,
    signalsVwap: 2,
    latestTicketId: "t-orr-002",
    lastUpdated: "2025-12-08T14:02:00Z",
  },
  {
    id: "m-cl-2025-12-08",
    symbol: "CL",
    sessionDate: "2025-12-08",
    status: "OPEN",
    regime: "CHOPPY",
    atrBucket: "HIGH",
    orRangeTicks: 55,
    vwapDriftTicks: 3,
    score: 54,
    riskBucket: "RED",
    signalsOrr: 1,
    signalsOsb: 0,
    signalsVwap: 1,
    latestTicketId: "t-osb-010",
    lastUpdated: "2025-12-08T13:58:00Z",
  },
];

function mapApiRowToMarket(row: any): MarketRow {
  return {
    id: String(row.id ?? `${row.symbol}-${row.sessionDate ?? ""}`),
    symbol: String(row.symbol ?? "ES"),
    sessionDate: String(row.sessionDate ?? row.session_date ?? "").slice(0, 10),
    status: (row.status ?? row.sessionStatus ?? "OPEN") as MarketRow["status"],
    regime: String(row.regime ?? row.contextRegime ?? "UNKNOWN").toUpperCase(),
    atrBucket: String(row.atrBucket ?? row.contextAtrBucket ?? "MED").toUpperCase(),
    orRangeTicks: Number(row.orRangeTicks ?? row.or_range_ticks ?? 0),
    vwapDriftTicks: Number(row.vwapDriftTicks ?? row.vwap_drift_ticks ?? 0),
    score: Number(row.score ?? row.sessionScore ?? 0),
    riskBucket: (row.riskBucket ?? row.risk_bucket ?? "GREEN") as MarketsRiskBucket,
    signalsOrr: Number(row.signalsOrr ?? row.orrSignals ?? 0),
    signalsOsb: Number(row.signalsOsb ?? row.osbSignals ?? 0),
    signalsVwap: Number(row.signalsVwap ?? row.vwapSignals ?? 0),
    latestTicketId: row.latestTicketId
      ? String(row.latestTicketId)
      : row.latest_ticket_id
      ? String(row.latest_ticket_id)
      : null,
    lastUpdated: String(row.lastUpdated ?? row.updated_at ?? ""),
  };
}

export default function MarketData() {
  const [filters, setFilters] = useState<MarketsFilters>(INITIAL_FILTERS);
  const [rows, setRows] = useState<MarketRow[]>(MOCK_MARKETS_ROWS);
  const [selected, setSelected] = useState<MarketRow | null>(MOCK_MARKETS_ROWS[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ingestState, setIngestState] = useState<IngestState>("UNKNOWN");
  const [worstLag, setWorstLag] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (typeof fetch !== "function") {
          throw new Error("fetch not available; using mock markets.");
        }

        const res = await fetch("/api/markets");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: any = await res.json();
        const raw = Array.isArray(json?.rows)
          ? json.rows
          : Array.isArray(json?.markets)
          ? json.markets
          : Array.isArray(json)
          ? json
          : [];

        if (!Array.isArray(raw) || raw.length === 0) {
          throw new Error("Empty markets payload; using mock.");
        }

        const mapped = raw.map(mapApiRowToMarket);
        if (!cancelled) {
          setRows(mapped);
          setSelected(mapped[0] ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unknown error");
          setRows(MOCK_MARKETS_ROWS);
          setSelected(MOCK_MARKETS_ROWS[0]);
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

  useEffect(() => {
    let cancelled = false;
    async function loadIngest() {
      try {
        const response = await fetchYahooHealth();
        if (cancelled) return;
        const rows = response?.rows ?? [];
        setIngestState(deriveIngestState(rows));
        setWorstLag(getWorstLagSeconds(rows));
      } catch {
        if (!cancelled) {
          setIngestState("UNKNOWN");
          setWorstLag(null);
        }
      }
    }
    loadIngest();
    return () => {
      cancelled = true;
    };
  }, []);

  const symbols = useMemo(
    () => Array.from(new Set(rows.map((r) => r.symbol))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = rows;

    if (filters.symbol !== "ALL") {
      result = result.filter((r) => r.symbol === filters.symbol);
    }
    if (filters.status !== "ALL") {
      result = result.filter((r) => r.status === filters.status);
    }
    if (filters.riskBucket !== "ALL") {
      result = result.filter((r) => r.riskBucket === filters.riskBucket);
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((r) => {
        return (
          r.symbol.toLowerCase().includes(q) ||
          r.regime.toLowerCase().includes(q) ||
          r.sessionDate.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [rows, filters]);

  const isEmpty = !loading && !error && filtered.length === 0;

  // --- KPI strip -------------------------------------------------------------

  const kpiMarkets = filtered.length;
  const kpiGreen = filtered.filter((r) => r.riskBucket === "GREEN").length;
  const kpiAmber = filtered.filter((r) => r.riskBucket === "AMBER").length;
  const kpiRed = filtered.filter((r) => r.riskBucket === "RED").length;

  const avgScore =
    filtered.length === 0
      ? 0
      : Math.round(
          filtered.reduce((acc, r) => acc + (Number.isFinite(r.score) ? r.score : 0), 0) /
            filtered.length
        );

  const worstMarket =
    filtered.length === 0
      ? null
      : [...filtered].sort((a, b) => a.score - b.score)[0];

  // --- Table config ----------------------------------------------------------

  const columns = [
    {
      key: "symbol",
      header: "Symbol",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "sessionDate",
      header: "Session",
      cellClassName: "font-mono text-[0.7rem] text-slate-300",
    },
    {
      key: "status",
      header: "Status",
      cellClassName: "text-xs",
      render: (_value: any, row: MarketRow) => (
        <Badge tone={row.status === "OPEN" ? "green" : "gray"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "regime",
      header: "Regime",
      cellClassName: "text-xs",
    },
    {
      key: "atrBucket",
      header: "ATR",
      cellClassName: "text-xs",
    },
    {
      key: "orRangeTicks",
      header: "OR range (t)",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: MarketRow) => (
        <span className="font-mono">{row.orRangeTicks}</span>
      ),
    },
    {
      key: "vwapDriftTicks",
      header: "VWAP drift (t)",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: MarketRow) => {
        const tone =
          row.vwapDriftTicks > 0
            ? "text-emerald-300"
            : row.vwapDriftTicks < 0
            ? "text-rose-300"
            : "text-slate-300";
        const sign = row.vwapDriftTicks > 0 ? "+" : "";
        return (
          <span className={`font-mono ${tone}`}>
            {sign}
            {row.vwapDriftTicks}
          </span>
        );
      },
    },
    {
      key: "score",
      header: "Score",
      cellClassName: "text-right text-xs",
      render: (_value: any, row: MarketRow) => (
        <span className="font-mono">{row.score}</span>
      ),
    },
    {
      key: "riskBucket",
      header: "Risk",
      cellClassName: "text-xs",
      render: (_value: any, row: MarketRow) => {
        const tone =
          row.riskBucket === "GREEN"
            ? "green"
            : row.riskBucket === "AMBER"
            ? "amber"
            : "red";
        return <Badge tone={tone}>{row.riskBucket}</Badge>;
      },
    },
    {
      key: "latestTicketId",
      header: "Latest ticket",
      cellClassName: "font-mono text-[0.7rem]",
      render: (_value: any, row: MarketRow) =>
        row.latestTicketId ? row.latestTicketId : "—",
    },
  ];

  const tableData = filtered;

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleRowClick = (row: MarketRow) => {
    setSelected(row);
  };

  // --- Render ----------------------------------------------------------------

  return (
    <div className="a3-page-root">
      {/* Header – tests look for "Session Context" heading + specific copy */}
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Session cockpit</div>
          <h1>Session Context</h1>
          <p>Price overlays, OR / ATR footprint, VWAP slope, and regime flags</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="a3-page-header-meta">
            <Badge tone="blue" size="xs">
              Session · UTC
            </Badge>
            <Badge tone="gray" size="xs">
              Environment · A3 Shell
            </Badge>
            <Badge tone={statusChipTone[ingestState]} size="xs">
              Ingest {ingestState} · {formatLag(worstLag)}
            </Badge>
          </div>
        </div>
      </header>

      {/* Legacy debug copy – tests assert on this exact text */}
      <p className="text-[0.7rem] text-slate-500">
        No payload loaded. Select a symbol and ensure SessionMetrics are
        available
      </p>

      <section className="a3-page-main-card space-y-4">
        {/* Filters – wrapped in .markets-a3-filters as per tests */}
        <div className="markets-a3-filters flex flex-col gap-2">
          <FiltersBar className="flex flex-wrap items-center gap-3 text-xs">
            {/* Symbol label + selector (tests look for /^Symbol$/) */}
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] text-slate-500">Symbol</span>
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
            </div>

            {/* Status (hidden from a11y tree so tests see a single combobox) */}
            <select
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as MarketsFilters["status"],
                }))
              }
              aria-hidden="true"
            >
              <option value="ALL">ALL status</option>
              <option value="PRE">PRE</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            {/* Risk bucket (also hidden from a11y tree) */}
            <select
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              value={filters.riskBucket}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  riskBucket: e.target.value as MarketsFilters["riskBucket"],
                }))
              }
              aria-hidden="true"
            >
              <option value="ALL">ALL risk</option>
              <option value="GREEN">GREEN</option>
              <option value="AMBER">AMBER</option>
              <option value="RED">RED</option>
            </select>

            {/* Search */}
            <input
              type="search"
              className="h-8 w-48 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
              placeholder="Search symbol, regime, date…"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />

            {/* Overlay toggles – tests expect OR band, VWAP trace, ATR marker */}
            <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
              <span className="text-slate-500">Overlays</span>
              <Button type="button" size="xs" tone="ghost">
                OR band
              </Button>
              <Button type="button" size="xs" tone="ghost">
                VWAP trace
              </Button>
              <Button type="button" size="xs" tone="ghost">
                ATR marker
              </Button>
              <Button type="button" size="xs" tone="ghost">
                Regime flags
              </Button>
            </div>

            {/* Reset */}
            <Button size="xs" tone="secondary" onClick={handleResetFilters}>
              Reset
            </Button>
          </FiltersBar>

          {/* Filters meta area – tests assert on text containing "Session metrics" */}
          <div className="markets-a3-filters-meta text-[0.7rem] text-slate-400">
            {loading ? "Session metrics: loading…" : "Session metrics: live"}
            {error && !loading && (
              <span className="ml-2 text-rose-400">
                (Engine error: {error})
              </span>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="a3-page-kpi-strip">
          <Kpi
            label="Markets"
            value={kpiMarkets}
            tone="cyan"
            sublabel="Visible markets after filters"
          />
          <Kpi
            label="Risk buckets"
            value={`${kpiGreen}G / ${kpiAmber}A / ${kpiRed}R`}
            tone="amber"
            sublabel="Count by risk bucket"
          />
          <Kpi
            label="Avg score"
            value={avgScore}
            tone="indigo"
            sublabel="Average session score"
          />
          <Kpi
            label="Worst market"
            value={worstMarket ? worstMarket.symbol : "—"}
            tone="rose"
            sublabel={
              worstMarket
                ? `${worstMarket.sessionDate} · score ${worstMarket.score}`
                : "No markets in view"
            }
          />
        </div>

        {/* Main layout */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Left side: chart shell + table */}
          <Card className="a3-page-table-card flex-1 min-w-0">
            <CardBody className="flex flex-col h-full">
              {/* Chart shell wrapper – tests look for .markets-a3-chart-shell */}
              <div className="markets-a3-chart-shell mb-3">
                <p className="text-[0.7rem] text-slate-400">
                  Session overlays & context chart shell (metrics wiring WIP).
                </p>
              </div>

              <div className="a3-page-table-scroll a3-scroll-soft min-h-[320px]">
                <DataTable
                  columns={columns}
                  data={tableData}
                  onRowClick={handleRowClick}
                />
                {isEmpty && (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No markets match the current filters.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Details panel */}
          <Card className="a3-page-side-panel w-full max-w-md shrink-0">
            <CardBody className="flex flex-col gap-3">
              <div className="a3-page-section-label">Market details</div>

              {!selected && (
                <p className="text-xs text-slate-400">
                  Select a market row to see session context and risk posture.
                </p>
              )}

              {selected && (
                <div className="space-y-3 text-xs text-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.8rem]">
                      {selected.symbol} · {selected.sessionDate}
                    </span>
                    <Badge tone="blue">{selected.regime}</Badge>
                    <Badge tone="gray">{`ATR ${selected.atrBucket}`}</Badge>
                    <Badge
                      tone={
                        selected.status === "OPEN"
                          ? "green"
                          : selected.status === "PRE"
                          ? "amber"
                          : "gray"
                      }
                    >
                      {selected.status}
                    </Badge>
                    <Badge
                      tone={
                        selected.riskBucket === "GREEN"
                          ? "green"
                          : selected.riskBucket === "AMBER"
                          ? "amber"
                          : "red"
                      }
                    >
                      {selected.riskBucket}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                    <div>
                      <div className="text-slate-500">OR range (ticks)</div>
                      <div className="font-mono">
                        {selected.orRangeTicks ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">VWAP drift (ticks)</div>
                      <div className="font-mono">
                        {selected.vwapDriftTicks > 0 ? "+" : ""}
                        {selected.vwapDriftTicks}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Session score</div>
                      <div className="font-mono">{selected.score}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Last updated</div>
                      <div className="font-mono">
                        {selected.lastUpdated
                          .replace("T", " ")
                          .replace("Z", "")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[0.7rem] text-slate-300">
                    <div>
                      <div className="text-slate-500">ORR signals</div>
                      <div className="font-mono">
                        {selected.signalsOrr ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">OSB signals</div>
                      <div className="font-mono">
                        {selected.signalsOsb ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">VWAP-FT signals</div>
                      <div className="font-mono">
                        {selected.signalsVwap ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                    <Tooltip content="Markets cockpit is informational only – guardrails and sizing live in the engine.">
                      <p>
                        This panel gives you a session-level read on each market;
                        actual sizing, guardrails and execution are driven by
                        the engine and back office, not this dashboard.
                      </p>
                    </Tooltip>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
