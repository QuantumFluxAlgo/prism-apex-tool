import React from "react";
import { fmtPrice } from "../utils/number";
import Badge from "../ui/Badge";
import type { WorklistTicket } from "./WorklistV2";

export type WorklistV2Column = {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render?: (row: WorklistTicket) => React.ReactNode;
};

const formatPrice = (value?: number | null) => {
  if (typeof value !== "number") return "—";
  return fmtPrice(value);
};

const renderScoreCell = (row: WorklistTicket) => {
  const scoreValue =
    typeof row.score === "number" && Number.isFinite(row.score) ? row.score : "—";
  const arrow = row.side === "SHORT" ? "▼" : "▲";
  const arrowTone = row.side === "SHORT" ? "score-arrow-short" : "score-arrow-long";
  return (
    <span className="score-cell">
      <span className="score-value">{scoreValue}</span>
      <span className={`score-arrow ${arrowTone}`} aria-hidden="true">
        {arrow}
      </span>
    </span>
  );
};

const formatTime = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatRiskDollars = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(0)}`;
};

const renderRiskCell = (row: WorklistTicket) => {
  const badgeTone = row.riskDecision
    ? row.riskDecision.allowed
      ? "emerald"
      : "rose"
    : "amber";
  const badgeLabel = row.riskDecision
    ? row.riskDecision.allowed
      ? "ALLOW"
      : "BLOCK"
    : "CHECK";
  return (
    <div className="flex flex-col items-center gap-1 leading-tight">
      <Badge tone={badgeTone} size="xs">
        {badgeLabel}
      </Badge>
      <span className="tickets-cell-mono text-[0.75rem] text-slate-200">
        {formatRiskDollars(row.riskDollars)}
      </span>
    </div>
  );
};

export const worklistV2Columns: WorklistV2Column[] = [
  {
    key: "symbol",
    header: "Symbol",
    headerClassName: "text-left",
    cellClassName: "tickets-cell-mono",
  },
  {
    key: "side",
    header: "Side",
    headerClassName: "text-center",
    cellClassName: "text-center",
    render: (row) => (
      <Badge
        className={row.side === "LONG" ? "cell-long" : "cell-short"}
        tone={row.side === "LONG" ? "emerald" : "rose"}
      >
        {row.side}
      </Badge>
    ),
  },
  {
    key: "score",
    header: "Score",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => renderScoreCell(row),
  },
  {
    key: "riskDecision",
    header: "Risk",
    headerClassName: "text-center text-slate-500 w-[98px]",
    cellClassName: "text-center w-[98px]",
    render: (row) => renderRiskCell(row),
  },
  {
    key: "entryPrice",
    header: "Entry",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => formatPrice(row.entryPrice),
  },
  {
    key: "stopPrice",
    header: "Stop",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => formatPrice(row.stopPrice),
  },
  {
    key: "targetPrice",
    header: "Target",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => formatPrice(row.targetPrice),
  },
  {
    key: "contracts",
    header: "QTY",
    headerClassName: "text-right text-slate-500 w-[68px]",
    cellClassName: "text-right tickets-cell-mono w-[68px]",
  },
  {
    key: "ageMinutes",
    header: "Age",
    headerClassName: "text-right text-slate-500",
    cellClassName: "text-right tickets-cell-mono",
    render: (row) => {
      if (typeof row.ageMinutes !== "number" || Number.isNaN(row.ageMinutes)) {
        return "—";
      }
      return `${row.ageMinutes}m`;
    },
  },
  {
    key: "sessionDate",
    header: "Ticket time (UTC)",
    headerClassName: "text-left",
    cellClassName: "text-left text-slate-300",
    render: (row) => (
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-slate-200">{row.sessionDate}</span>
        <span className="text-[0.65rem] text-slate-400">
          {formatTime(row.ticketTimeUtc)}
        </span>
        <span className="text-[0.6rem] uppercase status-muted">
          {row.sessionMetrics?.sessionQualityFlag ?? "—"}
        </span>
      </div>
    ),
  },
];

export const resolveColumnCell = (col: WorklistV2Column, row: WorklistTicket) => {
  if (col.render) return col.render(row);
  const value = (row as any)[col.key];
  if (value == null || value === "") return "—";
  return value;
};
