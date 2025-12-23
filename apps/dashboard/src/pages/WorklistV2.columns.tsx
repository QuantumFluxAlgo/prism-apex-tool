import React from "react";
import { pnlTicksCell } from "@prism-apex/ui-table";
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

export const worklistV2Columns: WorklistV2Column[] = [
  {
    key: "symbol",
    header: "SYMBOL",
    headerClassName: "text-left",
    cellClassName: "tickets-cell-mono",
  },
  {
    key: "strategy",
    header: "STRATEGY",
    headerClassName: "text-left",
    cellClassName: "text-slate-300",
  },
  {
    key: "side",
    header: "SIDE",
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
    header: "SCORE",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => renderScoreCell(row),
  },
  {
    key: "riskDecision",
    header: "RISK",
    headerClassName: "text-center text-slate-500 w-[76px]",
    cellClassName: "text-center w-[76px]",
    render: (row) =>
      row.riskDecision ? (
        <Badge tone={row.riskDecision.allowed ? "emerald" : "rose"}>
          {row.riskDecision.allowed ? "ALLOW" : "BLOCK"}
        </Badge>
      ) : (
        "—"
      ),
  },
  {
    key: "rrMultiple",
    header: "RR",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => {
      const value =
        typeof row.rrMultiple === "number" && Number.isFinite(row.rrMultiple)
          ? row.rrMultiple
          : null;
      const bucket =
        value == null
          ? "status-muted"
          : value >= 2
          ? "rr-good"
          : value >= 1
          ? "rr-mid"
          : "rr-bad";
      return (
        <span className={`${bucket} rr-plain`}>
          {value == null ? "—" : value.toFixed(2)}
        </span>
      );
    },
  },
  {
    key: "entryPrice",
    header: "ENTRY",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => formatPrice(row.entryPrice),
  },
  {
    key: "stopPrice",
    header: "STOP",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => formatPrice(row.stopPrice),
  },
  {
    key: "targetPrice",
    header: "TARGET",
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
    key: "riskDollars",
    header: "RISK ($)",
    headerClassName: "text-right text-slate-500 w-[88px]",
    cellClassName: "text-right tickets-cell-mono w-[88px]",
    render: (row) =>
      typeof row.riskDollars === "number" ? `$${row.riskDollars.toFixed(0)}` : "—",
  },
  {
    key: "pnlTicks",
    header: "PNL (TICKS)",
    headerClassName: "text-right text-slate-500 w-[90px]",
    cellClassName: "text-right tickets-cell-mono w-[90px]",
    render: (row) => pnlTicksCell(row.pnlTicks),
  },
  {
    key: "ageMinutes",
    header: "AGE (MIN)",
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
  {
    key: "sessionDate",
    header: "SESSION",
    headerClassName: "text-left",
    cellClassName: "text-left text-slate-300",
    render: (row) => (
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-slate-200">{row.sessionDate}</span>
        <span className="text-[0.6rem] uppercase status-muted">
          {row.sessionMetrics?.sessionQualityFlag ?? "—"}
        </span>
      </div>
    ),
  },
  {
    key: "source",
    header: "SOURCE",
    render: (row) => row.canonical?.source ?? "ENGINE",
  },
];

export const resolveColumnCell = (col: WorklistV2Column, row: WorklistTicket) => {
  if (col.render) return col.render(row);
  const value = (row as any)[col.key];
  if (value == null || value === "") return "—";
  return value;
};
