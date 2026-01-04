// @ts-nocheck
/* Prism Apex – Tickets (Lifecycle)
 *
 * Operator-facing ticket history for the current environment.
 *
 * Key goals:
 * - Show ACCEPTED lifecycle tickets (OPEN/EXPIRED/etc.)
 * - Show Ticketizer-only REJECTED candidates (from ticket_candidates) via an operator toggle
 * - Keep totals invariant across limits (server-calculated total)
 * - Support all-time history via offset pagination (Load more)
 *
 * NOTE: This page intentionally does NOT use ExecutionShell to avoid requiring
 * auth/session chrome when used for debugging and ops.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../ui/Card";
import Badge from "../ui/Badge";
import Kpi from "../ui/Kpi";
import Tooltip from "../ui/Tooltip";
import { fetchTicketsLifecycle, fetchYahooHealth } from "../lib/api";
import {
  ingestStateFromHealth,
  ingestStateLabel,
  statusChipTone,
} from "../lib/ingestState";
import { logContractError, logPageLoad } from "../lib/contractTelemetry";

type TicketsLifecycleOutcome = "ACCEPTED" | "REJECTED";

type TicketsFilters = {
  outcome: TicketsLifecycleOutcome;

  symbol: string; // "ALL" or actual
  strategy: string; // "ALL" or actual
  direction: string; // "ALL" | "LONG" | "SHORT"
  status: string; // "ALL" | "OPEN" | "EXPIRED" | ...

  search: string;
};

const INITIAL_FILTERS: TicketsFilters = {
  outcome: "ACCEPTED",
  symbol: "ALL",
  strategy: "ALL",
  direction: "ALL",
  status: "ALL",
  search: "",
};

function fmtUtc(ts?: string | null) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toISOString().replace("T", " ").replace(".000Z", "Z");
  } catch {
    return ts;
  }
}

function fmtNum(n?: number | null, dp = 2) {
  if (n === null || n === undefined) return "—";
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function normalizeOutcome(v: unknown): TicketsLifecycleOutcome {
  return v === "REJECTED" ? "REJECTED" : "ACCEPTED";
}

function normalizeDirection(v: unknown): "LONG" | "SHORT" {
  return v === "SHORT" ? "SHORT" : "LONG";
}

function mapLifecycleRow(r: any) {
  // tolerate snake_case/camelCase drift
  const entry =
    (r.entryPrice as number | null | undefined) ??
    (r.entry_price as number | null | undefined) ??
    null;
  const stop =
    (r.stopPrice as number | null | undefined) ??
    (r.stop_price as number | null | undefined) ??
    null;
  const target =
    (r.targetPrice as number | null | undefined) ??
    (r.target_price as number | null | undefined) ??
    null;

  const rr =
    (r.rrMultiple as number | null | undefined) ??
    (r.rr_multiple as number | null | undefined) ??
    (r.rr as number | null | undefined) ??
    null;

  const risk =
    (r.riskDollars as number | null | undefined) ??
    (r.risk_dollars as number | null | undefined) ??
    null;

  const outcome = normalizeOutcome(r.outcome ?? r.status);
  const direction = normalizeDirection(r.direction ?? r.side);

  const sessionTs =
    (r.session_ts_utc as string | undefined) ??
    (r.sessionTsUtc as string | undefined) ??
    (r.opened_at_utc as string | undefined) ??
    (r.openedAtUtc as string | undefined) ??
    null;

  const sessionDate =
    (r.session_date as string | undefined) ??
    (r.sessionDate as string | undefined) ??
    (typeof sessionTs === "string" ? sessionTs.slice(0, 10) : "");

  return {
    // primary identity for selection
    key:
      (typeof r.id === "string" && r.id) ||
      (typeof r.ticketId === "string" && r.ticketId) ||
      `${r.symbol ?? "?"}:${r.strategy ?? r.strategyId ?? "?"}:${sessionTs ?? ""}:${direction}:${outcome}`,

    sessionTsUtc: sessionTs,
    sessionDate,

    symbol: r.symbol ?? "",
    strategy:
      (typeof r.strategy === "string" && r.strategy.length ? r.strategy : null) ??
      (typeof r.strategyId === "string" && r.strategyId.length ? r.strategyId : null) ??
      null,

    direction,

    outcome,
    status: outcome === "REJECTED" ? "REJECTED" : (r.status ?? "—"),

    actionable: Boolean(r.actionable),
    reason: (r.reason as string | null | undefined) ?? null,

    meetsStrategyParams:
      (r.meets_strategy_params as boolean | null | undefined) ??
      (r.meetsStrategyParams as boolean | null | undefined) ??
      null,
    meetsApexRules:
      (r.meets_apex_rules as boolean | null | undefined) ??
      (r.meetsApexRules as boolean | null | undefined) ??
      null,

    entry,
    stop,
    target,
    rrMultiple: rr,
    riskDollars: risk,

    rejectionReason:
      (r.rejection_reason as string | null | undefined) ??
      (r.rejectionReason as string | null | undefined) ??
      null,
    rejectReasons:
      (Array.isArray(r.reject_reasons) ? r.reject_reasons : null) ??
      (Array.isArray(r.rejectReasons) ? r.rejectReasons : null),

    meta: r.meta ?? null,
  };
}

/**
 * Server fetch (lifecycle endpoint) + minimal client shaping.
 * Uses offset pagination because operator needs all-time history.
 */
async function fetchLifecyclePage(filters: TicketsFilters, cursor: number) {
  const outcome = filters.outcome;

  const symbol = filters.symbol !== "ALL" ? filters.symbol : undefined;
  const strategy = filters.strategy !== "ALL" ? filters.strategy : undefined;
  const direction =
    filters.direction !== "ALL"
      ? (filters.direction as "LONG" | "SHORT")
      : undefined;

  const status =
    outcome === "REJECTED"
      ? "REJECTED"
      : filters.status !== "ALL"
      ? filters.status
      : undefined;

  const res = await fetchTicketsLifecycle({
    symbol,
    strategy,
    direction,
    status,
    outcome,
    limit: 200,
    cursor,
  });

  return {
    total: res.total ?? 0,
    nextCursor: typeof res.nextCursor === "number" ? res.nextCursor : null,
    rows: (res.rows ?? res.tickets ?? []).map(mapLifecycleRow),
  };
}

export default function Tickets() {
  const [filters, setFilters] = useState<TicketsFilters>(INITIAL_FILTERS);

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<number | null>(0);

  const [selected, setSelected] = useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [yahooHealth, setYahooHealth] = useState<any | null>(null);
  const ingestState = useMemo(
    () => ingestStateFromHealth(yahooHealth),
    [yahooHealth]
  );

  useEffect(() => {
    logPageLoad({ page: "TicketsLifecycle" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const h = await fetchYahooHealth();
        if (!cancelled) setYahooHealth(h);
      } catch {}
    }

    tick();
    const t = window.setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSelected(null);

      try {
        const res = await fetchLifecyclePage(filters, 0);
        if (cancelled) return;

        setRows(res.rows);
        setTotal(res.total);
        setNextCursor(
          res.nextCursor ??
            (res.rows.length < res.total ? res.rows.length : null)
        );
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load tickets.");
        logContractError({
          page: "TicketsLifecycle",
          error: e?.message ?? String(e),
        });
        setRows([]);
        setTotal(0);
        setNextCursor(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.outcome, filters.symbol, filters.strategy, filters.direction, filters.status]);

  async function loadMore() {
    if (loading) return;
    if (nextCursor === null || nextCursor === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchLifecyclePage(filters, nextCursor);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.key));
        const appended = res.rows.filter((r) => !seen.has(r.key));
        return prev.concat(appended);
      });
      setTotal(res.total);
      setNextCursor(
        res.nextCursor ??
          (nextCursor + res.rows.length < res.total
            ? nextCursor + res.rows.length
            : null)
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more.");
      logContractError({
        page: "TicketsLifecycle",
        error: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((t) => {
      return (
        String(t.symbol).toLowerCase().includes(q) ||
        String(t.strategy ?? "").toLowerCase().includes(q) ||
        String(t.direction).toLowerCase().includes(q) ||
        String(t.status).toLowerCase().includes(q) ||
        String(t.rejectionReason ?? "").toLowerCase().includes(q) ||
        (Array.isArray(t.rejectReasons)
          ? t.rejectReasons.join(",").toLowerCase().includes(q)
          : false)
      );
    });
  }, [rows, filters.search]);

  const shown = filtered.length;

  const kpiAccepted = useMemo(
    () => rows.filter((r) => r.outcome === "ACCEPTED").length,
    [rows]
  );
  const kpiRejected = useMemo(
    () => rows.filter((r) => r.outcome === "REJECTED").length,
    [rows]
  );

  const symbolOptions = useMemo(
    () => [
      "ALL",
      "ES=F",
      "MES=F",
      "NQ=F",
      "MNQ=F",
      "YM=F",
      "RTY=F",
      "GC=F",
      "CL=F",
      "6E=F",
      "EURUSD=X",
      "BTC-USD",
      "^GDAXI",
    ],
    []
  );

  const strategyOptions = useMemo(
    () => ["ALL", "ORR", "APX-DDB-01", "APX-OSB-01", "APX-VWAP-FT"],
    []
  );

  const statusOptions = useMemo(
    () => ["ALL", "OPEN", "EXPIRED", "FILLED", "CANCELLED", "REJECTED"],
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-[1440px] mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Tickets</h1>
              <Badge tone="blue" size="xs">
                Lifecycle ledger
              </Badge>
              <Badge tone="gray" size="xs">
                Read-only
              </Badge>
              <Badge tone={statusChipTone[ingestState]} size="xs">
                {ingestStateLabel(ingestState)}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              All-time ticket history. Toggle{" "}
              <span className="text-slate-200">Rejected</span> to view
              Ticketizer-only drops.
            </p>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div>
              Loaded: <span className="text-slate-200">{rows.length}</span> /{" "}
              <span className="text-slate-200">{total}</span>
            </div>
            <div>
              Shown (search): <span className="text-slate-200">{shown}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardBody className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-400">Outcome</div>
                <div className="flex rounded-lg overflow-hidden border border-slate-800">
                  <button
                    className={`px-3 py-1.5 text-xs ${
                      filters.outcome === "ACCEPTED"
                        ? "bg-slate-800 text-slate-100"
                        : "bg-slate-950 text-slate-300 hover:bg-slate-900"
                    }`}
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        outcome: "ACCEPTED",
                        status: p.status === "REJECTED" ? "ALL" : p.status,
                      }))
                    }
                    type="button"
                  >
                    Accepted
                  </button>
                  <button
                    className={`px-3 py-1.5 text-xs ${
                      filters.outcome === "REJECTED"
                        ? "bg-slate-800 text-slate-100"
                        : "bg-slate-950 text-slate-300 hover:bg-slate-900"
                    }`}
                    onClick={() =>
                      setFilters((p) => ({ ...p, outcome: "REJECTED", status: "REJECTED" }))
                    }
                    type="button"
                  >
                    Rejected
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Symbol</span>
                <select
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                  value={filters.symbol}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, symbol: e.target.value }))
                  }
                >
                  {symbolOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Strategy</span>
                <select
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                  value={filters.strategy}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, strategy: e.target.value }))
                  }
                >
                  {strategyOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Side</span>
                <select
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                  value={filters.direction}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, direction: e.target.value }))
                  }
                >
                  <option value="ALL">ALL</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status</span>
                <select
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                  value={filters.outcome === "REJECTED" ? "REJECTED" : filters.status}
                  disabled={filters.outcome === "REJECTED"}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {statusOptions
                    .filter((s) => (filters.outcome === "REJECTED" ? s === "REJECTED" : s !== "REJECTED"))
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex items-center gap-2 flex-1 min-w-[220px]">
                <span className="text-xs text-slate-400">Search</span>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="symbol / strategy / status / reject reason…"
                />
              </label>

              <div className="ml-auto flex items-center gap-2">
                <Tooltip text="Loads the next page from the server. Search filters apply only to the loaded window.">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-50"
                    disabled={loading || nextCursor === null}
                    onClick={loadMore}
                  >
                    {loading ? "Loading…" : nextCursor === null ? "No more" : "Load more"}
                  </button>
                </Tooltip>
              </div>
            </div>

            {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi value={total} label="Total matching (server)" tone="indigo" />
          <Kpi value={rows.length} label="Loaded rows" tone="cyan" />
          <Kpi value={kpiAccepted} label="Accepted (loaded)" tone="emerald" />
          <Kpi value={kpiRejected} label="Rejected (loaded)" tone="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/40 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Session (UTC)</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Strategy</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-left">Outcome</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actionable</th>
                    <th className="px-3 py-2 text-right">Entry</th>
                    <th className="px-3 py-2 text-right">Stop</th>
                    <th className="px-3 py-2 text-right">Target</th>
                    <th className="px-3 py-2 text-right">RR</th>
                    <th className="px-3 py-2 text-left">Reject</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.key}
                      className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-900/70 ${
                        selected?.key === t.key ? "bg-slate-900/70" : ""
                      }`}
                      onClick={() => setSelected(t)}
                    >
                      <td className="px-3 py-2 text-slate-300">{fmtUtc(t.sessionTsUtc)}</td>
                      <td className="px-3 py-2">{t.symbol}</td>
                      <td className="px-3 py-2 text-slate-300">{t.strategy ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge tone={t.direction === "LONG" ? "green" : "red"} size="xs">
                          {t.direction}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={t.outcome === "REJECTED" ? "amber" : "blue"} size="xs">
                          {t.outcome}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="gray" size="xs">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={t.actionable ? "emerald" : "gray"} size="xs">
                          {t.actionable ? "YES" : "NO"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-200">{fmtNum(t.entry)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{fmtNum(t.stop)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{fmtNum(t.target)}</td>
                      <td className="px-3 py-2 text-right text-slate-200">{fmtNum(t.rrMultiple, 2)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {t.outcome === "REJECTED"
                          ? t.rejectionReason ?? (Array.isArray(t.rejectReasons) ? t.rejectReasons[0] : "—")
                          : t.reason ?? "—"}
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={12} className="px-3 py-10 text-center text-slate-400">
                        No tickets match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              {!selected ? (
                <div className="text-sm text-slate-400">Select a row to see a drilldown.</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{`Symbol ${selected.symbol}`}</Badge>
                    <Badge tone="gray">{`Strategy ${selected.strategy ?? "—"}`}</Badge>
                    <Badge tone={selected.direction === "LONG" ? "green" : "red"}>
                      {selected.direction}
                    </Badge>
                    <Badge tone={selected.outcome === "REJECTED" ? "amber" : "blue"}>
                      {selected.outcome}
                    </Badge>
                    <Badge tone="gray">{selected.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">Session (UTC)</div>
                      <div className="text-slate-200">{fmtUtc(selected.sessionTsUtc)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Actionable</div>
                      <div className="text-slate-200">{selected.actionable ? "YES" : "NO"}</div>
                    </div>

                    <div>
                      <div className="text-slate-500">Entry</div>
                      <div className="text-slate-200">{fmtNum(selected.entry)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Stop</div>
                      <div className="text-slate-200">{fmtNum(selected.stop)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Target</div>
                      <div className="text-slate-200">{fmtNum(selected.target)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">RR</div>
                      <div className="text-slate-200">{fmtNum(selected.rrMultiple, 2)}</div>
                    </div>
                  </div>

                  {selected.outcome === "REJECTED" ? (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-xs text-slate-400 mb-2">Reject reason(s)</div>
                      <div className="space-y-2">
                        <div className="text-sm text-slate-200">{selected.rejectionReason ?? "—"}</div>
                        {Array.isArray(selected.rejectReasons) && selected.rejectReasons.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selected.rejectReasons.slice(0, 12).map((r: string) => (
                              <Badge key={r} tone="amber" size="xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-xs text-slate-400 mb-1">Non-actionable reason</div>
                      <div className="text-sm text-slate-200">{selected.reason ?? "—"}</div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-xs text-slate-400 mb-2">Raw meta</div>
                    <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-auto max-h-64">
{JSON.stringify(selected.meta ?? {}, null, 2)}
                    </pre>
                  </div>

                  <div className="text-xs text-slate-500">
                    Operator note: This is a read-only view. Worklist actions remain unchanged.
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
