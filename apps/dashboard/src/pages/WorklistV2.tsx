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
import Kpi from "../ui/Kpi";
import FiltersBar from "../components/FiltersBar";
import DataTable from "../ui/DataTable";

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

const columns = [
  {
    key: "ticketId",
    header: "Ticket",
    width: "80px",
    cellClassName: "font-mono text-[0.7rem] text-slate-300",
  },
  {
    key: "symbol",
    header: "Symbol",
    width: "80px",
    cellClassName: "font-mono text-[0.75rem] text-slate-100",
  },
  {
    key: "strategy",
    header: "Strat",
    width: "72px",
    cellClassName: "font-mono text-[0.7rem] text-slate-300",
  },
  {
    key: "side",
    header: "Side",
    width: "64px",
    render: (_: any, row: WorklistTicket) => (
      <Badge tone={row.side === "LONG" ? "emerald" : "rose"}>{row.side}</Badge>
    ),
  },
  {
    key: "score",
    header: "Score",
    width: "90px",
    cellClassName: "text-right text-[0.7rem]",
    render: (_value: any, row: WorklistTicket) => (
      <span className="inline-flex items-center justify-end gap-1 font-mono">
        <span>{row.score}</span>
        <span className={trendTone(row.trend)}>{renderTrendArrow(row.trend)}</span>
        <span className="text-[10px] text-slate-500">{row.delta}</span>
      </span>
    ),
  },
  {
    key: "riskDecision",
    header: "Risk",
    width: "80px",
    render: (_value: any, row: WorklistTicket) => (
      <Badge tone={riskBucketTone(row.riskBucket)}>
        {row.riskDecision?.allowed ? "ALLOW" : "BLOCK"}
      </Badge>
    ),
  },
  {
    key: "rrMultiple",
    header: "RR",
    width: "72px",
    cellClassName: "text-right font-mono text-[0.7rem]",
    render: (_: any, row: WorklistTicket) =>
      typeof row.rrMultiple === "number" ? row.rrMultiple.toFixed(2) : "—",
  },
  {
    key: "contracts",
    header: "Qty",
    width: "60px",
    cellClassName: "text-right font-mono text-[0.7rem]",
    render: (_: any, row: WorklistTicket) =>
      row.contracts != null ? row.contracts : "—",
  },
  {
    key: "riskDollars",
    header: "Risk ($)",
    width: "90px",
    cellClassName: "text-right font-mono text-[0.7rem]",
    render: (_: any, row: WorklistTicket) =>
      typeof row.riskDollars === "number" ? row.riskDollars.toFixed(0) : "—",
  },
  {
    key: "pnlTicks",
    header: "PnL (ticks)",
    width: "96px",
    cellClassName: "text-right font-mono text-[0.7rem]",
    render: (_: any, row: WorklistTicket) => {
      if (typeof row.pnlTicks !== "number") return "—";
      const v = row.pnlTicks;
      const cls =
        v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-slate-300";
      return <span className={cls}>{v}</span>;
    },
  },
  {
    key: "ageMinutes",
    header: "Age (min)",
    width: "76px",
    cellClassName: "text-right font-mono text-[0.7rem] text-slate-400",
  },
  {
    key: "sessionDate",
    header: "Session",
    width: "120px",
    cellClassName: "text-[0.7rem] text-slate-400",
    render: (_: any, row: WorklistTicket) => (
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-slate-300">{row.sessionDate}</span>
        <span className="text-[0.6rem] uppercase text-slate-500">
          {row.sessionMetrics?.sessionQualityFlag ?? "—"}
        </span>
      </div>
    ),
  },
  {
    key: "flags",
    header: "Flags",
    width: "120px",
    cellClassName: "text-[0.65rem] text-slate-300",
    render: (_: any, row: WorklistTicket) =>
      row.sessionFlags?.flags?.length ? (
        <div className="flex flex-wrap gap-1">
          {row.sessionFlags.flags.map((flag) => (
            <Badge key={flag}>{flag}</Badge>
          ))}
        </div>
      ) : (
        "None"
      ),
  },
];

export default function WorklistV2() {
  const { tickets, loading, error, selected, setSelected, refresh } =
    useWorklistTickets();
  const [ingestState, setIngestState] = useState<IngestState>("UNKNOWN");
  const [ingestCounts, setIngestCounts] = useState({ GREEN: 0, AMBER: 0, RED: 0 });
  const [worstLag, setWorstLag] = useState<number | null>(null);

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
      } catch {
        if (!cancelled) {
          setIngestState("UNKNOWN");
          setIngestCounts({ GREEN: 0, AMBER: 0, RED: 0 });
          setWorstLag(null);
        }
      }
    }
    loadIngest();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="a3-page-root">
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
          <div className="flex items-center gap-2">
            <Button size="xs" tone="ghost" onClick={refresh}>
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {ingestUnsafe && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-[0.8rem] text-rose-100">
          TRADING UNSAFE — ingest not live or lagged. Check Status.
        </div>
      )}

      <section className="a3-page-main-card">
        {/* Filters + KPIs */}
        <FiltersBar />
        <div className="a3-page-kpi-strip">
          <Kpi
            label="Actionable tickets"
            value={kpis.actionable}
            tone="emerald"
            sublabel={`of ${kpis.total} open`}
          />
          <Kpi
            label="Blocked by risk"
            value={kpis.blocked}
            tone="rose"
            sublabel="guardrail blocks"
          />
          <Kpi
            label="Average score"
            value={kpis.avgScore}
            tone="indigo"
            sublabel="0–100"
          />
          <Kpi
            label="Selected RR"
            value={
              selected && typeof selected.rrMultiple === "number"
                ? selected.rrMultiple.toFixed(2)
                : "—"
            }
            tone="amber"
            sublabel={selected?.symbol ?? "—"}
          />
        </div>

        {/* Main layout: table + details */}
        <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(260px,0.9fr)] gap-3 min-h-[420px]">
          {/* Table card */}
          <Card className="a3-page-table-card min-h-[420px]">
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
                <DataTable
                  rows={tickets}
                  columns={columns}
                  keyField="ticketId"
                  size="compact"
                  onRowClick={(row: WorklistTicket) => setSelected(row)}
                  selectedRowKey={selected?.ticketId ?? null}
                />
              </div>
            </CardBody>
          </Card>

          {/* Details panel */}
          <Card className="a3-page-side-panel min-h-[420px]">
            <CardBody className="flex flex-col h-full gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="a3-page-section-label">Details</div>
                  <div className="text-sm font-semibold text-slate-50">
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
                <div className="flex flex-col gap-3 text-[0.75rem] text-slate-200">
                  {/* Core metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[0.65rem] text-slate-500 mb-0.5">
                        Score
                      </div>
                      <div className="font-mono">
                        {selected.score}{" "}
                        <span className={trendTone(selected.trend)}>
                          {renderTrendArrow(selected.trend)}
                        </span>{" "}
                        <span className="text-[0.6rem] text-slate-500">
                          Δ {selected.delta}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] text-slate-500 mb-0.5">
                        RR / Qty / Risk
                      </div>
                      <div className="font-mono">
                        {selected.rrMultiple != null
                          ? selected.rrMultiple.toFixed(2)
                          : "—"}{" "}
                        RR · {selected.contracts ?? "—"} x · {selected.riskDollars != null ? `$${selected.riskDollars.toFixed(0)}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] text-slate-500 mb-0.5">
                        PnL (ticks)
                      </div>
                      <div className="font-mono">
                        {typeof selected.pnlTicks === "number" ? selected.pnlTicks : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] text-slate-500 mb-0.5">
                        Age / Session
                      </div>
                      <div className="font-mono">
                        {selected.ageMinutes} min · {selected.sessionDate}
                      </div>
                    </div>
                  </div>

                  {/* Risk decision */}
                  {selected.riskDecision && (
                    <div className="pt-2 border-t border-slate-800 text-[0.7rem] space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                        Risk decision
                      </div>
                      <dl className="grid grid-cols-2 gap-2">
                        <div>
                          <dt className="text-slate-500">Allowed</dt>
                          <dd className="font-mono">
                            {selected.riskDecision.allowed ? "YES" : "NO"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Codes</dt>
                          <dd className="font-mono">
                            {selected.riskDecision.codes?.join(", ") || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Warnings</dt>
                          <dd>{selected.riskDecision.warnings?.join("; ") || "None"}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Reason</dt>
                          <dd>{selected.riskDecision.reason || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {/* Session flags */}
                  <div className="pt-2 border-t border-slate-800 text-[0.7rem]">
                    <div className="mb-1 uppercase tracking-[0.18em] text-slate-500 text-[0.65rem]">
                      Session flags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.sessionFlags?.flags?.length
                        ? selected.sessionFlags.flags.map((flag) => (
                            <Badge key={flag}>{flag}</Badge>
                          ))
                        : "No session flags"}
                    </div>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div className="pt-2 border-t border-slate-800 text-[0.7rem]">
                      <div className="mb-1 uppercase tracking-[0.18em] text-slate-500 text-[0.65rem]">
                        Notes
                      </div>
                      <p className="text-slate-200 whitespace-pre-wrap">
                        {selected.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[0.75rem] text-slate-500">
                  Select a ticket from the table to view details.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
