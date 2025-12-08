// @ts-nocheck
/* PRISM APEX – Worklist V2 A3 Cockpit
 *
 * This is a self-contained A3-style operator cockpit:
 * - Header under ExecutionShell
 * - Filters strip
 * - KPI strip
 * - Main table
 * - Details panel
 *
 * Data is now sourced via useWorklistTickets:
 * - Primary: /api/worklist (engine-backed).
 * - Fallback: in-memory mock data with realistic shape.
 */

import React, { useMemo, useState } from "react";
import ExecutionShell from "../layouts/ExecutionShell";
import { Card, CardBody } from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Kpi from "../ui/Kpi";
import FiltersBar from "../ui/FiltersBar";
import DataTable from "../ui/DataTable";
import Tooltip from "../ui/Tooltip";
import {
  useWorklistTickets,
  WorklistTicket,
  WorklistRiskBucket,
  WorklistSide,
} from "../hooks/useWorklistTickets";

// --- Temporary canonical-shaped mock data ------------------------------------

const MOCK_WORKLIST_ROWS: WorklistTicket[] = [
  {
    ticketId: "t-orr-001",
    symbol: "MESZ4",
    strategy: "ORR",
    side: "LONG",
    score: 86,
    riskBucket: "GREEN",
    ageMinutes: 4,
    pnlTicks: 10,
    sessionDate: "2025-12-08",
    createdAt: "2025-12-08T14:00:00Z",
    notes: "Clean OR reversal after strong open drive.",
  },
  {
    ticketId: "t-orr-002",
    symbol: "NQZ4",
    strategy: "ORR",
    side: "SHORT",
    score: 78,
    riskBucket: "AMBER",
    ageMinutes: 9,
    pnlTicks: -4,
    sessionDate: "2025-12-08",
    createdAt: "2025-12-08T13:55:00Z",
    notes: "Aggressive fade; news risk elevated.",
  },
  {
    ticketId: "t-osb-010",
    symbol: "CLF5",
    strategy: "OSB",
    side: "LONG",
    score: 72,
    riskBucket: "GREEN",
    ageMinutes: 16,
    pnlTicks: 0,
    sessionDate: "2025-12-08",
    createdAt: "2025-12-08T13:48:00Z",
    notes: "Breakout from OR high, low volatility regime.",
  },
  {
    ticketId: "t-vwapft-021",
    symbol: "MESZ4",
    strategy: "VWAP-FT",
    side: "SHORT",
    score: 65,
    riskBucket: "RED",
    ageMinutes: 22,
    pnlTicks: -12,
    sessionDate: "2025-12-08",
    createdAt: "2025-12-08T13:40:00Z",
    notes: "Fade against strong trend; poor session quality.",
  },
];

// --- Filters state -----------------------------------------------------------

type SideFilter = "ALL" | WorklistSide;
type RiskFilter = "ALL" | WorklistRiskBucket;

interface FiltersState {
  symbol: string;
  strategy: string;
  side: SideFilter;
  riskBucket: RiskFilter;
  minScore: number;
  maxAgeMinutes: number | null;
  search: string;
}

const DEFAULT_FILTERS: FiltersState = {
  symbol: "ALL",
  strategy: "ALL",
  side: "ALL",
  riskBucket: "ALL",
  minScore: 0,
  maxAgeMinutes: 30,
  search: "",
};

// --- Component ---------------------------------------------------------------

const WorklistV2: React.FC = () => {
  const { tickets, loading, error } = useWorklistTickets({
    mockFallback: MOCK_WORKLIST_ROWS,
  });

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<WorklistTicket | null>(null);

  const symbols = useMemo(
    () => Array.from(new Set(tickets.map((r) => r.symbol))).sort(),
    [tickets]
  );
  const strategies = useMemo(
    () => Array.from(new Set(tickets.map((r) => r.strategy))).sort(),
    [tickets]
  );

  const filteredRows = useMemo(() => {
    return tickets.filter((row) => {
      if (filters.symbol !== "ALL" && row.symbol !== filters.symbol) return false;
      if (filters.strategy !== "ALL" && row.strategy !== filters.strategy) return false;
      if (filters.side !== "ALL" && row.side !== filters.side) return false;
      if (filters.riskBucket !== "ALL" && row.riskBucket !== filters.riskBucket)
        return false;
      if (row.score < filters.minScore) return false;
      if (
        filters.maxAgeMinutes != null &&
        row.ageMinutes > filters.maxAgeMinutes
      )
        return false;

      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const haystack = [
          row.ticketId,
          row.symbol,
          row.strategy,
          row.side,
          row.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [tickets, filters]);

  // --- KPI calculations ------------------------------------------------------

  const kpiTotalTickets = filteredRows.length;
  const kpiGreen = filteredRows.filter((r) => r.riskBucket === "GREEN").length;
  const kpiAmber = filteredRows.filter((r) => r.riskBucket === "AMBER").length;
  const kpiRed = filteredRows.filter((r) => r.riskBucket === "RED").length;

  const avgScore =
    filteredRows.length === 0
      ? 0
      : Math.round(
          filteredRows.reduce((acc, r) => acc + r.score, 0) /
            filteredRows.length
        );

  const latestTicket = filteredRows[0] ?? null;

  // --- Table configuration ---------------------------------------------------

  const columns = [
    {
      key: "ticketId",
      header: "Ticket ID",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "symbol",
      header: "Symbol",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "strategy",
      header: "Strategy",
      cellClassName: "font-mono text-xs",
      render: (_value, row: WorklistTicket) => (
        <span className="inline-flex items-center gap-1">
          <span>{row.strategy}</span>
          <Badge tone="blue" data-testid="badge">
            OR
          </Badge>
        </span>
      ),
    },
    {
      key: "side",
      header: "Side",
      cellClassName: "text-xs",
      render: (_value, row: WorklistTicket) => (
        <Badge tone={row.side === "LONG" ? "green" : "red"}>{row.side}</Badge>
      ),
    },
    {
      key: "score",
      header: "Score",
      cellClassName: "text-right text-xs",
      render: (_value, row: WorklistTicket) => (
        <span className="font-mono">{row.score}</span>
      ),
    },
    {
      key: "riskBucket",
      header: "Risk",
      cellClassName: "text-xs",
      render: (_value, row: WorklistTicket) => {
        const tone =
          row.riskBucket === "GREEN"
            ? "green"
            : row.riskBucket === "AMBER"
            ? "amber"
            : "red";
        return (
          <Badge tone={tone} data-testid="badge">
            {row.riskBucket}
          </Badge>
        );
      },
    },
    {
      key: "pnlTicks",
      header: "PnL (ticks)",
      cellClassName: "text-right text-xs",
      render: (_value, row: WorklistTicket) => {
        const sign = row.pnlTicks > 0 ? "+" : row.pnlTicks < 0 ? "−" : "";
        const abs = Math.abs(row.pnlTicks);
        const tone =
          row.pnlTicks > 0 ? "green" : row.pnlTicks < 0 ? "red" : "gray";

        return (
          <Tooltip content={`${row.pnlTicks} ticks`}>
            <span
              className={`font-mono ${
                tone === "green"
                  ? "text-emerald-300"
                  : tone === "red"
                  ? "text-rose-300"
                  : "text-slate-300"
              }`}
            >
              {sign}
              {abs}
            </span>
          </Tooltip>
        );
      },
    },
    {
      key: "ageMinutes",
      header: "Age (min)",
      cellClassName: "text-right text-xs text-slate-300",
      render: (_value, row: WorklistTicket) => (
        <span className="font-mono">{row.ageMinutes}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created at",
      cellClassName: "text-right text-[0.7rem] text-slate-400",
      render: (_value, row: WorklistTicket) => (
        <span className="font-mono">
          {row.createdAt.replace("T", " ").replace("Z", "")}
        </span>
      ),
    },
  ];

  const tableData = filteredRows.map((row) => ({
    ...row,
  }));

  // --- Handlers --------------------------------------------------------------

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRowClick = (row: WorklistTicket) => {
    setSelected(row);
  };

  // --- Render ----------------------------------------------------------------

  return (
    <ExecutionShell>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-100">
                Worklist
              </h1>
              <p className="text-xs text-slate-400">
                Canonical worklist tickets for the current environment. Read-only
                cockpit – no order routing.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem]">
              <span data-testid="badge" tone="blue">
                Live · SIM environment
              </span>
              <span data-testid="badge" tone="gray">
                ORR · OSB · VWAP-FT
              </span>
            </div>
          </div>
          {(loading || error) && (
            <div className="mt-1 text-[0.7rem] text-slate-400">
              {loading && <span>Loading worklist from engine…</span>}
              {!loading && error && (
                <span>
                  Engine worklist unavailable; using illustrative tickets only.
                </span>
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
                  <option value="ORR">ORR</option>
                  <option value="OSB">OSB</option>
                  <option value="VWAP-FT">VWAP-FT</option>
                </select>

                {/* Side */}
                <select
                  className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                  value={filters.side}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      side: e.target.value as SideFilter,
                    }))
                  }
                >
                  <option value="ALL">ALL sides</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>

                {/* Risk bucket */}
                <select
                  className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                  value={filters.riskBucket}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      riskBucket: e.target.value as RiskFilter,
                    }))
                  }
                >
                  <option value="ALL">ALL risk</option>
                  <option value="GREEN">GREEN</option>
                  <option value="AMBER">AMBER</option>
                  <option value="RED">RED</option>
                </select>

                {/* Min score */}
                <div className="flex items-center gap-1">
                  <span className="text-[0.7rem] text-slate-400">Min score</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="h-8 w-16 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2 text-right text-xs"
                    value={filters.minScore}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        minScore: Number.isNaN(parseInt(e.target.value, 10))
                          ? 0
                          : Math.max(
                              0,
                              Math.min(100, parseInt(e.target.value, 10))
                            ),
                      }))
                    }
                  />
                </div>

                {/* Max age */}
                <div className="flex items-center gap-1">
                  <span className="text-[0.7rem] text-slate-400">Max age</span>
                  <input
                    type="number"
                    min={0}
                    className="h-8 w-16 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2 text-right text-xs"
                    value={filters.maxAgeMinutes ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setFilters((f) => ({
                        ...f,
                        maxAgeMinutes: Number.isNaN(v) ? null : v,
                      }));
                    }}
                    placeholder="∞"
                  />
                  <span className="text-[0.7rem] text-slate-500">min</span>
                </div>

                {/* Search */}
                <input
                  type="search"
                  className="h-8 w-48 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                  placeholder="Search ticket, symbol, notes…"
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
            label="Tickets"
            value={kpiTotalTickets}
            hint="Visible tickets after filters."
          />
          <Kpi
            label="Avg score"
            value={avgScore}
            hint="Average engine score for visible tickets."
          />
          <Kpi
            label="Risk buckets"
            value={`${kpiGreen}G / ${kpiAmber}A / ${kpiRed}R`}
            hint="Count of tickets by risk bucket."
          />
          <Kpi
            label="Latest ticket"
            value={latestTicket ? latestTicket.ticketId : "—"}
            hint={latestTicket ? latestTicket.symbol : "No tickets in view."}
          />
        </div>

        {/* Main layout: table + details */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <Card className="flex-1 min-w-0">
            <CardBody>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <DataTable
                  columns={columns}
                  data={tableData}
                  onRowClick={handleRowClick}
                />
                {tableData.length === 0 && !loading && (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No tickets match the current filters.
                  </div>
                )}
                {tableData.length === 0 && loading && (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    Loading tickets…
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Details panel */}
          <Card className="w-full max-w-md shrink-0">
            <CardBody>
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Ticket details
              </h2>
              {!selected && (
                <p className="mt-3 text-xs text-slate-400">
                  Select a ticket from the table to see session context, guardrails,
                  and notes.
                </p>
              )}

              {selected && (
                <div className="mt-3 space-y-3 text-xs text-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.8rem]">
                      {selected.ticketId}
                    </span>
                    <Badge tone="blue">{selected.symbol}</Badge>
                    <Badge tone="gray">{selected.strategy}</Badge>
                    <Badge tone={selected.side === "LONG" ? "green" : "red"}>
                      {selected.side}
                    </Badge>
                    <Badge tone="amber">{selected.riskBucket}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                    <div>
                      <div className="text-slate-500">Score</div>
                      <div className="font-mono">{selected.score}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">PnL (ticks)</div>
                      <div className="font-mono">
                        {selected.pnlTicks > 0 ? "+" : ""}
                        {selected.pnlTicks}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Age</div>
                      <div className="font-mono">
                        {selected.ageMinutes} min
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Created</div>
                      <div className="font-mono">
                        {selected.createdAt
                          .replace("T", " ")
                          .replace("Z", "")}
                      </div>
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="pt-2 border-t border-slate-800 text-[0.75rem] text-slate-200">
                      <div className="mb-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
                        Engine notes
                      </div>
                      <p>{selected.notes}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                    <p>
                      This panel is read-only. Actual order sizing, routing, and
                      guardrail enforcement live in the engine and back-office
                      config, not the dashboard.
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </ExecutionShell>
  );
};

export default WorklistV2;

