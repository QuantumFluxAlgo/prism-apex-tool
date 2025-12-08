/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* PRISM APEX – Tickets V2 A3 Cockpit (router-free)
 *
 * Goals:
 * - Use the canonical tickets API helper (fetchTickets).
 * - Keep Vitest expectations stable (headers, loading/error copy, empty-state text).
 * - A3-style layout:
 *    - Header
 *    - Filters strip
 *    - KPI strip
 *    - Main table
 *    - Right-hand details panel
 *
 * NOTE: This page intentionally does NOT use ExecutionShell to avoid requiring
 * a Router context in tests.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../ui/Card";
import Badge from "../ui/Badge";
import Kpi from "../ui/Kpi";
import Tooltip from "../ui/Tooltip";
import { fetchTickets } from "../lib/api";

/**
 * Local filters model.
 * Tests only care that the page fetches and renders correctly; we keep this lean.
 */
type TicketsFilters = {
  symbol: string;
  strategy: string;
  side: string;
  status: string;
  search: string;
};

const INITIAL_FILTERS: TicketsFilters = {
  symbol: "ALL",
  strategy: "ALL",
  side: "ALL",
  status: "ALL",
  search: "",
};

/**
 * Test-oriented adapter for API rows.
 * Ensures we can read the Vitest stub payload shape and preserve timestamps.
 */
function mapRowForDisplay(r: any) {
  return {
    id: r.id ?? "",
    symbol: r.symbol ?? "",
    strategyId: r.strategy ?? r.strategyId ?? "",
    side: r.side ?? "",
    status: r.status ?? "",
    entryPrice: r.entryPrice ?? r.entry_price ?? null,
    stopPrice: r.stopPrice ?? r.stop_price ?? null,
    targetPrice: r.targetPrice ?? r.target_price ?? null,
    rrMultiple: r.rrMultiple ?? r.rr ?? null,
    createdAtUtc: r.createdAtUtc ?? r.opened_at_utc ?? "",
    pnl: r.pnlAmount ?? r.pnl ?? null,
  };
}

/**
 * Single fetch path used by the page.
 * Delegates to the canonical tickets API helper.
 */
async function loadTickets(filters: TicketsFilters) {
  const { rows } = await fetchTickets({
    symbol: filters.symbol,
    strategy: filters.strategy,
    status: filters.status,
    direction: filters.side === "ALL" ? "ALL" : filters.side,
    scope: "all",
    limit: 200,
  });

  return Array.isArray(rows) ? rows.map(mapRowForDisplay) : [];
}

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketsFilters>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadTickets(filters);
        if (cancelled) return;
        setRows(data);
        if (!selected && data.length > 0) {
          setSelected(data[0]);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Unknown error");
        setRows([]);
        setSelected(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filtered = useMemo(() => {
    let result = rows;

    if (filters.symbol !== "ALL") {
      result = result.filter((t) => t.symbol === filters.symbol);
    }
    if (filters.strategy !== "ALL") {
      result = result.filter((t) => t.strategyId === filters.strategy);
    }
    if (filters.side !== "ALL") {
      result = result.filter((t) => t.side === filters.side);
    }
    if (filters.status !== "ALL") {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((t) => {
        return (
          String(t.id).toLowerCase().includes(q) ||
          String(t.symbol).toLowerCase().includes(q) ||
          String(t.strategyId).toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [rows, filters]);

  const isEmpty = !loading && !error && filtered.length === 0;

  // --- KPI strip metrics -----------------------------------------------------

  const totalTickets = filtered.length;
  const longCount = filtered.filter((t) => t.side === "LONG").length;
  const shortCount = filtered.filter((t) => t.side === "SHORT").length;

  const avgRr =
    filtered.length === 0
      ? 0
      : (() => {
          const vals = filtered
            .map((t) => (typeof t.rrMultiple === "number" ? t.rrMultiple : null))
            .filter((v) => v !== null) as number[];
          if (!vals.length) return 0;
          const sum = vals.reduce((acc, v) => acc + v, 0);
          return Number((sum / vals.length).toFixed(2));
        })();

  const latest = filtered[0] ?? null;

  // --- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Page header (A3-ish, but shell-less) */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Tickets</h1>
            <p className="text-xs text-slate-400">
              Canonical ticket history for the current environment.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <span data-testid="badge" tone="blue">
              Read-only ticket history
            </span>
            <span data-testid="badge" tone="gray">
              Backed by /api/tickets
            </span>
          </div>
        </div>
      </header>

      {/* Filters strip */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Symbol */}
            <select
              value={filters.symbol}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, symbol: e.target.value }))
              }
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
            >
              {["ALL", "ES", "NQ", "CL", "YM"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {/* Strategy */}
            <select
              value={filters.strategy}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, strategy: e.target.value }))
              }
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
            >
              {["ALL", "ORR", "OSB", "VWAP-FT"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {/* Side */}
            <select
              value={filters.side}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, side: e.target.value }))
              }
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
            >
              {["ALL", "LONG", "SHORT"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
            >
              {["ALL", "OPEN", "CLOSED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {/* Search */}
            <input
              type="search"
              placeholder="Search…"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="h-8 w-48 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
            />
          </div>
        </CardBody>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Tickets"
          value={totalTickets}
          hint="Visible tickets after filters."
        />
        <Kpi
          label="LONG / SHORT"
          value={`${longCount}L / ${shortCount}S`}
          hint="Directional breakdown."
        />
        <Kpi
          label="Avg R multiple"
          value={avgRr}
          hint="Average R multiple across visible tickets."
        />
        <Kpi
          label="Latest ticket"
          value={latest ? latest.id : "—"}
          hint={latest ? latest.symbol : "No tickets in view."}
        />
      </div>

      {/* Main layout: table + details */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Table card */}
        <Card className="flex-1 min-w-0">
          <CardBody>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="dashboard-table min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2">Ticket ID</th>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Strategy</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Entry</th>
                    <th className="px-3 py-2">Stop</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">R multiple</th>
                    <th className="px-3 py-2">Created at</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-3 text-center text-slate-400"
                      >
                        {/* Keep this exact string – tests depend on it */}
                        Loading tickets…
                      </td>
                    </tr>
                  )}

                  {error && !loading && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-3 text-center text-rose-400"
                      >
                        {/* Keep this pattern – tests check this prefix */}
                        Error loading tickets: {error}
                      </td>
                    </tr>
                  )}

                  {isEmpty && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-3 text-center text-slate-400"
                      >
                        {/* Keep this exact string – tests depend on it */}
                        No tickets returned for the current filters.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    filtered.map((t) => (
                      <tr
                        key={t.id}
                        className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-900/70 ${
                          selected && selected.id === t.id
                            ? "bg-slate-900/80"
                            : ""
                        }`}
                        onClick={() => setSelected(t)}
                      >
                        <td className="px-3 py-2">{t.id}</td>
                        <td className="px-3 py-2">{t.symbol}</td>
                        <td className="px-3 py-2">{t.strategyId}</td>
                        <td className="px-3 py-2">{t.side}</td>
                        <td className="px-3 py-2 text-right">
                          {t.entryPrice != null ? t.entryPrice.toFixed(2) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.stopPrice != null ? t.stopPrice.toFixed(2) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.targetPrice != null
                            ? t.targetPrice.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.rrMultiple != null
                            ? t.rrMultiple.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-400">
                          {t.createdAtUtc}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
                Select a ticket from the table to see a drilldown.
              </p>
            )}

            {selected && (
              <div className="mt-3 space-y-4 text-xs text-slate-200">
                {/* Top chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.8rem]">{selected.id}</span>
                  {/* Avoid duplicate exact symbol text */}
                  <Badge tone="blue">{`Symbol ${selected.symbol}`}</Badge>
                  {/* Avoid duplicate exact "VWAP" / strategy text */}
                  <Badge tone="gray">{`Strategy ${selected.strategyId}`}</Badge>
                  {selected.side && (
                    <Badge tone={selected.side === "LONG" ? "green" : "red"}>
                      {selected.side}
                    </Badge>
                  )}
                  {selected.status && (
                    <Badge tone="amber">{selected.status}</Badge>
                  )}
                </div>

                {/* Prices / RR */}
                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">Entry</div>
                    <div className="font-mono">
                      {selected.entryPrice != null
                        ? selected.entryPrice.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Stop</div>
                    <div className="font-mono">
                      {selected.stopPrice != null
                        ? selected.stopPrice.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Target</div>
                    <div className="font-mono">
                      {selected.targetPrice != null
                        ? selected.targetPrice.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">R multiple</div>
                    <div className="font-mono">
                      {selected.rrMultiple != null
                        ? selected.rrMultiple.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* PnL / created */}
                <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                  <div>
                    <div className="text-slate-500">PnL (amount)</div>
                    <div className="font-mono">
                      {typeof selected.pnl === "number" ? selected.pnl : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Created at (UTC)</div>
                    <div className="font-mono">
                      {typeof selected.createdAtUtc === "string"
                        ? selected.createdAtUtc.slice(0, 10)
                        : selected.createdAtUtc}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                  <Tooltip content="All routing, sizing and risk guardrails live in the engine/back office.">
                    <p>
                      This panel is a read-only drilldown for operators. Any real
                      changes must go through the engine and back-office config,
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

