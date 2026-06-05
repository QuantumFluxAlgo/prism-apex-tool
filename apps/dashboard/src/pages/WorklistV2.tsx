// @ts-nocheck
/* PRISM APEX – Worklist V2 A3 Cockpit (canonical)
 *
 * Operator-facing Worklist cockpit:
 * - Header under ExecutionShell
 * - Filters strip
 * - KPI strip
 * - Main table (canonical Worklist tickets)
 * - Details panel with risk + session context
 *
 * Data:
 * - Primary: /api/worklist (backend canonical)
 * - Fallback: /api/tickets (status=OPEN, scope=actionable)
 */

import React, { useEffect, useMemo, useState } from "react";

import { Card, CardBody } from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import FiltersBar from "../components/FiltersBar";
import DataTable from "../ui/DataTable";
import { fmtPrice } from "../utils/number";
import { worklistV2Columns, resolveColumnCell } from "./WorklistV2.columns";
import "../styles/worklist-v2.css";

import {
  useWorklistTickets,
  type WorklistTicket,
  type WorklistTrend,
  type WorklistRiskBucket,
} from "../hooks/useWorklistTickets";
import { fetchYahooHealth } from "../lib/api";
import {
  deriveIngestState,
  summarizeIngestRows,
  statusChipTone,
  getWorstLagSeconds,
  formatLag,
  RED_THRESHOLD_SECONDS,
  type IngestState,
} from "../lib/ingestState";
import { logContractError, logPageLoad } from "../lib/contractTelemetry";
import {
  fetchOperatorRiskSession,
  markTicketEntered,
  updateOperatorRiskSession,
  type OperatorRiskSession,
} from "../lib/api";

function trendTone(trend: WorklistTrend): string {
  switch (trend) {
    case "UP":
      return "text-emerald-400";
    case "DOWN":
      return "text-rose-400";
    default:
      return "text-slate-400";
  }
}

function renderTrendArrow(trend: WorklistTrend): string {
  switch (trend) {
    case "UP":
      return "▲";
    case "DOWN":
      return "▼";
    default:
      return "◆";
  }
}

function riskBucketTone(bucket: WorklistRiskBucket): "emerald" | "amber" | "rose" {
  switch (bucket) {
    case "GREEN":
      return "emerald";
    case "RED":
      return "rose";
    case "AMBER":
    default:
      return "amber";
  }
}

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(0)}`;
};

export default function WorklistV2() {
  const { tickets, loading, error, selected, setSelected, refresh } =
    useWorklistTickets();
  const columnCount = worklistV2Columns.length;
  const [ingestState, setIngestState] = useState<IngestState>("UNKNOWN");
  const [ingestCounts, setIngestCounts] = useState({ GREEN: 0, AMBER: 0, RED: 0 });
  const [worstLag, setWorstLag] = useState<number | null>(null);
  const [operatorRisk, setOperatorRisk] = useState<OperatorRiskSession | null>(null);
  const [riskInput, setRiskInput] = useState("");
  const [riskSaving, setRiskSaving] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [enterLoading, setEnterLoading] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshMs, setAutoRefreshMs] = useState(5000);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    logPageLoad("WorklistV2");
  }, []);

  useEffect(() => {
    setLastRefreshAt(new Date());
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled || !Number.isFinite(autoRefreshMs) || autoRefreshMs <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      refresh();
      setLastRefreshAt(new Date());
    }, autoRefreshMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefreshEnabled, autoRefreshMs, refresh]);

  useEffect(() => {
    let cancelled = false;
    async function loadIngest() {
      try {
        const response = await fetchYahooHealth();
        if (cancelled) return;
        const rows = response?.rows ?? [];
        setIngestState(deriveIngestState(rows));
        setIngestCounts(summarizeIngestRows(rows));
        setWorstLag(getWorstLagSeconds(rows));
      } catch (err: any) {
        if (!cancelled) {
          setIngestState("UNKNOWN");
          setIngestCounts({ GREEN: 0, AMBER: 0, RED: 0 });
          setWorstLag(null);
          logContractError({
            pageId: "WorklistV2",
            endpoint: "/api/health/yahoo",
            error: err,
          });
        }
      }
    }
    loadIngest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRisk() {
      try {
        const data = await fetchOperatorRiskSession();
        if (cancelled) return;
        setOperatorRisk(data);
        if (typeof data?.dailyRiskLimitUsd === "number") {
          setRiskInput(String(data.dailyRiskLimitUsd));
        }
        setRiskError(null);
      } catch (err: any) {
        if (!cancelled) {
          setRiskError(err?.message ?? "Failed to load daily risk");
        }
      }
    }
    loadRisk();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRiskSubmit = async () => {
    if (!riskInput.trim()) {
      setRiskError("Enter a daily risk limit");
      return;
    }
    const parsed = Number(riskInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRiskError("Daily risk must be a positive number");
      return;
    }
    setRiskSaving(true);
    setRiskError(null);
    try {
      const data = await updateOperatorRiskSession(parsed);
      setOperatorRisk(data);
    } catch (err: any) {
      setRiskError(err?.message ?? "Failed to update daily risk");
    } finally {
      setRiskSaving(false);
    }
  };

  const riskRemainingDisplay =
    typeof operatorRisk?.riskRemainingUsd === "number"
      ? operatorRisk.riskRemainingUsd
      : null;

  const handleEnterTicket = async () => {
    if (!selected) return;
    setEnterLoading(true);
    setEnterError(null);
    try {
      await markTicketEntered(selected.ticketId);
      const latestRisk = await fetchOperatorRiskSession();
      setOperatorRisk(latestRisk);
      setSelected(null);
      refresh();
      setLastRefreshAt(new Date());
    } catch (err: any) {
      setEnterError(err?.message ?? "Failed to mark ticket as entered");
    } finally {
      setEnterLoading(false);
    }
  };

  const handleManualRefresh = () => {
    refresh();
    setLastRefreshAt(new Date());
  };

  const lastRefreshLabel = lastRefreshAt
    ? lastRefreshAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const kpis = useMemo(() => {
    const total = tickets.length;
    const actionable = tickets.filter((t) => t.riskDecision?.allowed !== false).length;
    const blocked = total - actionable;
    const avgScore =
      total > 0
        ? Math.round(
            tickets.reduce((acc, t) => acc + (t.score ?? 0), 0) / total,
          )
        : 0;

    return { total, actionable, blocked, avgScore };
  }, [tickets]);
  const ingestUnsafe =
    ingestState === "NOT LIVE" ||
    (typeof worstLag === "number" && worstLag > RED_THRESHOLD_SECONDS);

  return (
    <div className="a3-page-root worklist-v2">
      {/* Header */}
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Operator cockpit</div>
          <h1>Worklist V2 – Canonical tickets</h1>
          <p>Actionable guardrail-approved tickets the operator keys into Tradovate as an OCO.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="a3-page-header-meta">
            <span className="a3-chip a3-chip--muted">Manual OCO entry</span>
            <span className="a3-chip a3-chip--muted">Tickets only</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Badge tone={statusChipTone[ingestState]} size="xs">
              Ingest {ingestState} · {formatLag(worstLag)}
            </Badge>
            <span className="font-geist-mono">
              G:{ingestCounts.GREEN} A:{ingestCounts.AMBER} R:{ingestCounts.RED}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2 text-[0.75rem] text-slate-300">
            <div className="flex items-center gap-2">
              <Button size="xs" tone="ghost" onClick={handleManualRefresh}>
              Refresh
            </Button>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                />
                Auto
              </label>
              <select
                className="a3-input px-1 py-0.5 text-[0.7rem]"
                value={String(autoRefreshMs)}
                onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
                disabled={!autoRefreshEnabled}
              >
                <option value="3000">3s</option>
                <option value="5000">5s</option>
                <option value="10000">10s</option>
                <option value="15000">15s</option>
              </select>
            </div>
            <div className="text-[0.65rem] text-slate-400">
              Last refresh: {lastRefreshLabel}
            </div>
          </div>
          <div className="worklist-risk-control mt-2 w-full max-w-xs text-right text-[0.75rem]">
            <label className="uppercase tracking-wide text-slate-400 text-[0.65rem]">
              Daily Risk ($)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="a3-input flex-1 text-right"
                value={riskInput}
                disabled={operatorRisk?.locked}
                onChange={(e) => setRiskInput(e.target.value)}
              />
              <Button
                size="xs"
                tone="primary"
                onClick={handleRiskSubmit}
                disabled={riskSaving || operatorRisk?.locked}
              >
                Set
              </Button>
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-[0.7rem] text-slate-300">
              <span>
                Used: {formatCurrency(operatorRisk?.riskUsedUsd)} · Remaining:{" "}
                {formatCurrency(riskRemainingDisplay)}
              </span>
              <span>
                Status:{" "}
                {operatorRisk?.locked ? (
                  <span className="text-amber-300">Locked (session open)</span>
                ) : (
                  <span className="text-emerald-300">Editable</span>
                )}
              </span>
            </div>
            {riskError && (
              <div className="text-rose-300 text-[0.65rem] mt-1">{riskError}</div>
            )}
          </div>
        </div>
      </header>

      {ingestUnsafe && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-[0.8rem] text-rose-100">
          TRADING UNSAFE — ingest not live or lagged. Check Status.
        </div>
      )}
      {(!operatorRisk || operatorRisk.dailyRiskLimitUsd == null) && (
        <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-[0.8rem] text-amber-100">
          Daily risk limit not set — ticketizer is blocking all tickets until an operator
          sets the budget.
        </div>
      )}

      <section className="a3-page-main-card">
        {/* Filters + KPIs */}
        <FiltersBar />
        <div className="worklist-context-strip">
          <div className="worklist-context-item">
            <span className="worklist-context-label">Actionable tickets</span>
            <span className="worklist-context-value">{kpis.actionable}</span>
            <span className="worklist-context-meta">of {kpis.total} open</span>
          </div>
          <div className="worklist-context-item">
            <span className="worklist-context-label">Blocked by risk</span>
            <span className="worklist-context-value">{kpis.blocked}</span>
            <span className="worklist-context-meta">guardrail blocks</span>
          </div>
          <div className="worklist-context-item">
            <span className="worklist-context-label">Average score</span>
            <span className="worklist-context-value">{kpis.avgScore}</span>
            <span className="worklist-context-meta">0–100</span>
          </div>
          <div className="worklist-context-item">
            <span className="worklist-context-label">Selected RR</span>
            <span className="worklist-context-value">
              {selected && typeof selected.rrMultiple === "number"
                ? selected.rrMultiple.toFixed(2)
                : "—"}
            </span>
            <span className="worklist-context-meta">{selected?.symbol ?? "—"}</span>
          </div>
        </div>

        {/* Main layout: table + details */}
        <div className="worklist-main">
          {/* Table card */}
          <div className="worklist-table-region">
            <Card className="a3-page-table-card worklist-table-card min-h-[420px] h-full">
              <CardBody className="flex flex-col h-full">
              <div className="a3-table-headline">
                <div className="a3-page-section-label">Tickets</div>
                {(loading || error) && (
                  <div className="text-[0.7rem] text-slate-300">
                    {loading && <span>Loading worklist from engine…</span>}
                    {!loading && error && (
                      <span>
                        Engine tickets unavailable; Worklist feed unavailable.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="a3-page-table-scroll a3-scroll-soft min-h-[320px]">
                <table className="dashboard-table tickets-table min-w-full">
                  <thead>
                    <tr>
                      {worklistV2Columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-3 py-3 text-[0.65rem] uppercase tracking-wide ${col.headerClassName ?? ""}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={columnCount} className="tickets-v2-status-line">
                          Loading worklist from engine…
                        </td>
                      </tr>
                    )}
                    {error && !loading && (
                      <tr>
                        <td
                          colSpan={columnCount}
                          className="tickets-v2-status-line tickets-v2-status-error"
                        >
                          Engine tickets unavailable; Worklist feed unavailable.
                        </td>
                      </tr>
                    )}
                    {!loading && !error && tickets.length === 0 && (
                      <tr>
                        <td colSpan={columnCount} className="tickets-v2-status-line">
                          No worklist tickets returned for the current filters.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !error &&
                      tickets.map((row) => {
                        const isActive =
                          selected && selected.ticketId === row.ticketId;
                        const rowClasses = [
                          "tickets-row",
                          isActive && "tickets-row-active",
                          row.side === "LONG" ? "tickets-row-long" : "tickets-row-short",
                          row.riskBucket
                            ? `tickets-row-risk-${row.riskBucket.toLowerCase()}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <tr
                            key={row.ticketId}
                            className={rowClasses}
                            onClick={() => setSelected(row)}
                          >
                            {worklistV2Columns.map((col) => (
                              <td
                                key={col.key}
                                className={`px-3 py-3 align-middle ${col.cellClassName ?? "tickets-cell-mono"}`}
                              >
                                {resolveColumnCell(col, row)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              </CardBody>
            </Card>
          </div>

          {/* Details panel */}
          <aside className="worklist-details-panel">
            <Card className="a3-page-side-panel worklist-details-card min-h-[420px] h-full">
              <CardBody className="flex flex-col h-full gap-4">
              <div className="worklist-details-header">
                <div>
                  <div className="a3-page-section-label">Details</div>
                  <div className="worklist-details-title">
                    {selected
                      ? `${selected.symbol} – ${selected.strategy}`
                      : "No ticket selected"}
                  </div>
                </div>
                {selected && (
                  <Badge tone={riskBucketTone(selected.riskBucket)}>
                    {selected.riskDecision?.allowed ? "ALLOW" : "BLOCK"}
                  </Badge>
                )}
              </div>

              {selected ? (
                <div className="worklist-details-content">
                  <section className="worklist-details-section">
                    <div className="worklist-details-section-title">Identity</div>
                    <div className="worklist-details-pairs">
                      <div>
                        <div className="worklist-details-label">Symbol</div>
                        <div className="worklist-details-value font-mono">
                          {selected.symbol}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">Strategy</div>
                        <div className="worklist-details-value">
                          {selected.strategy}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">Side</div>
                        <div
                          className={`worklist-details-value ${
                            selected.side === "LONG"
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {selected.side}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="worklist-details-section">
                    <div className="worklist-details-section-title">Prices</div>
                    <div className="worklist-details-pairs">
                      <div>
                        <div className="worklist-details-label">Entry</div>
                        <div className="worklist-details-value font-mono">
                          {selected.entryPrice != null
                            ? fmtPrice(selected.entryPrice)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">Stop</div>
                        <div className="worklist-details-value font-mono">
                          {selected.stopPrice != null
                            ? fmtPrice(selected.stopPrice)
                            : "—"}
                          {selected.stopTicks != null &&
                            Number.isFinite(selected.stopTicks) && (
                              <div className="worklist-details-meta">
                                {selected.stopTicks > 0
                                  ? `+${selected.stopTicks.toFixed(0)}t`
                                  : `${selected.stopTicks.toFixed(0)}t`}
                              </div>
                            )}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">Target</div>
                        <div className="worklist-details-value font-mono">
                          {selected.targetPrice != null
                            ? fmtPrice(selected.targetPrice)
                            : "—"}
                          {selected.targetTicks != null &&
                            Number.isFinite(selected.targetTicks) && (
                              <div className="worklist-details-meta">
                                {selected.targetTicks > 0
                                  ? `+${selected.targetTicks.toFixed(0)}t`
                                  : `${selected.targetTicks.toFixed(0)}t`}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="worklist-details-section">
                    <div className="worklist-details-section-title">Risk &amp; Reward</div>
                    <div className="worklist-details-pairs">
                      <div>
                        <div className="worklist-details-label">Risk (PTS)</div>
                        <div className="worklist-details-value font-mono">
                          {typeof selected.riskPoints === "number"
                            ? selected.riskPoints.toFixed(2)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">
                          Risk ($ TOTAL @ recommended QTY)
                        </div>
                        <div className="worklist-details-value font-mono">
                          {selected.riskDollars != null
                            ? `$${selected.riskDollars.toFixed(0)}`
                            : "—"}
                          <div className="worklist-details-meta">
                            @{selected.contracts ?? "—"} QTY
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">Reward (PTS)</div>
                        <div className="worklist-details-value font-mono">
                          {typeof selected.rewardPoints === "number"
                            ? selected.rewardPoints.toFixed(2)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">
                          Reward ($ TOTAL @ recommended QTY)
                        </div>
                        <div className="worklist-details-value font-mono">
                          {typeof selected.rewardDollars === "number"
                            ? `$${selected.rewardDollars.toFixed(0)}`
                            : "—"}
                          <div className="worklist-details-meta">
                            @{selected.contracts ?? "—"} QTY
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">RR</div>
                        <div className="worklist-details-value font-mono">
                          {selected.rrMultiple != null
                            ? selected.rrMultiple.toFixed(2)
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="worklist-details-meta text-[0.7rem] text-slate-400">
                      Tick size {selected.tickSize ?? "—"} · Tick value{" "}
                      {typeof selected.tickValueUSD === "number"
                        ? `$${selected.tickValueUSD.toFixed(2)}`
                        : "—"}
                      <br />
                      Gross, excludes fees/slippage.
                    </div>
                  </section>

                  <section className="worklist-details-section">
                    <div className="worklist-details-section-title">Score &amp; Guardrails</div>
                    <div className="worklist-details-pairs">
                      <div>
                        <div className="worklist-details-label">Score</div>
                        <div className="worklist-details-value font-mono">
                          {selected.score}{" "}
                          <span className={trendTone(selected.trend)}>
                            {renderTrendArrow(selected.trend)}
                          </span>{" "}
                          <span className="worklist-details-meta">Δ {selected.delta}</span>
                        </div>
                      </div>
                      <div>
                        <div className="worklist-details-label">PnL (ticks)</div>
                        <div className="worklist-details-value font-mono">
                          {typeof selected.pnlTicks === "number"
                            ? selected.pnlTicks
                            : "—"}
                        </div>
                      </div>
                    </div>
                    {selected.riskDecision && (
                      <div className="worklist-risk-decision">
                        <div className="worklist-details-label uppercase">
                          Risk decision
                        </div>
                        <dl>
                          <div>
                            <dt>Allowed</dt>
                            <dd className="font-mono">
                              {selected.riskDecision.allowed ? "YES" : "NO"}
                            </dd>
                          </div>
                          <div>
                            <dt>Codes</dt>
                            <dd className="font-mono">
                              {selected.riskDecision.codes?.join(", ") || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Warnings</dt>
                            <dd>
                              {selected.riskDecision.warnings?.join("; ") || "None"}
                            </dd>
                          </div>
                          <div>
                            <dt>Reason</dt>
                            <dd>{selected.riskDecision.reason || "—"}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        tone="primary"
                        size="sm"
                        disabled={enterLoading || !selected}
                        onClick={handleEnterTicket}
                      >
                        {enterLoading ? "Entering..." : "Mark ENTERED"}
                      </Button>
                      {enterError && (
                        <span className="text-xs text-rose-300">{enterError}</span>
                      )}
                    </div>
                  </section>

                  <section className="worklist-details-section">
                    <div className="worklist-details-section-title">Session / flags</div>
                    <div className="worklist-details-pairs">
                      <div>
                        <div className="worklist-details-label">Age / Session</div>
                        <div className="worklist-details-value font-mono">
                          {selected.ageMinutes} min · {selected.sessionDate}
                        </div>
                      </div>
                    </div>
                    <div className="worklist-session-flags">
                      <div className="worklist-details-label uppercase">Session flags</div>
                      <div className="flex flex-wrap gap-1">
                        {selected.sessionFlags?.flags?.length
                          ? selected.sessionFlags.flags.map((flag) => (
                              <Badge key={flag}>{flag}</Badge>
                            ))
                          : "No session flags"}
                      </div>
                    </div>
                  </section>

                  {selected.notes && (
                    <section className="worklist-details-section">
                      <div className="worklist-details-section-title">Notes</div>
                      <p className="worklist-details-note">{selected.notes}</p>
                    </section>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[0.75rem] text-slate-500">
                  Select a ticket from the table to view details.
                </div>
              )}
              </CardBody>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
