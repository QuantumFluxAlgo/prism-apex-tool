/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* PRISM APEX – Worklist V2 hook (canonical)
 *
 * Operator-facing Worklist data hook.
 *
 * Priorities:
 * - Prefer canonical Worklist feed from /api/worklist.
 * - Fall back to /api/tickets (status=OPEN, scope=actionable) if needed.
 * - Don’t recompute what the backend already knows unless fields are missing.
 */

import { useEffect, useMemo, useState } from "react";

import {
  fetchTickets,
  buildCanonicalTicketFromRow,
  type SessionMetricsDto,
  type SessionFlagsSummary,
  type TicketRiskDecision,
} from "../lib/api";

export type WorklistSide = "LONG" | "SHORT";
export type WorklistRiskBucket = "GREEN" | "AMBER" | "RED";
export type WorklistTrend = "UP" | "FLAT" | "DOWN";

export interface WorklistTicket {
  ticketId: string;
  symbol: string;
  strategy: string;
  side: WorklistSide;

  // Engine score
  score: number; // 0–100
  trend: WorklistTrend;
  delta: WorklistTrend;

  // Risk
  contracts: number | null;
  rrMultiple: number | null;
  riskDollars: number | null;
  riskBucket: WorklistRiskBucket;
  riskDecision: TicketRiskDecision | null;

  // Time / PnL
  ageMinutes: number;
  pnlTicks: number;

  // Context
  sessionDate: string;
  sessionMetrics: SessionMetricsDto | null;
  sessionFlags: SessionFlagsSummary | null;

  // Canonical ticket view for details panel
  canonical: any;

  // Operator notes
  notes?: string | null;
}

interface ApiWorklistResponse {
  total: number;
  tickets: any[];
}

interface UseWorklistTicketsResult {
  tickets: WorklistTicket[];
  loading: boolean;
  error: string | null;
  selected: WorklistTicket | null;
  setSelected: (ticket: WorklistTicket | null) => void;
  refresh: () => void;
}

/**
 * Clamp numeric score into 0–100 range.
 */
function normalizeScore(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Normalize backend trend / delta into WorklistTrend.
 */
function normalizeTrend(value: unknown): WorklistTrend {
  if (value === "UP" || value === "DOWN" || value === "FLAT") {
    return value;
  }
  return "FLAT";
}

/**
 * Derive risk bucket from risk decision when backend
 * hasn’t provided a more granular mapping.
 */
function deriveRiskBucket(riskDecision: TicketRiskDecision | null): WorklistRiskBucket {
  if (!riskDecision) return "AMBER";
  if (!riskDecision.allowed) return "RED";
  if (riskDecision.warnings && riskDecision.warnings.length > 0) return "AMBER";
  return "GREEN";
}

/**
 * Compute ageMinutes from created/opened timestamp.
 */
function computeAgeMinutes(createdAt?: string | null): number {
  if (!createdAt) return 0;
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return 0;
  const diffMs = Date.now() - ts;
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / 60000);
}

/**
 * Fallback PnL ticks calculation from canonical fields when backend
 * hasn’t provided `pnlTicks`.
 */
function computePnlTicksFromCanonical(canonical: any): number {
  if (!canonical) return 0;
  const stopTicks = canonical.stopTicks;
  const perContractRisk = canonical.perContractRisk;
  const quantity = canonical.quantity ?? 1;

  if (
    !Number.isFinite(stopTicks) ||
    !Number.isFinite(perContractRisk) ||
    stopTicks <= 0
  ) {
    return 0;
  }

  const tickValue = perContractRisk / stopTicks;
  if (!Number.isFinite(tickValue) || tickValue <= 0) return 0;

  const pnl = canonical.pnl;
  if (typeof pnl === "number" && Number.isFinite(pnl)) {
    return Math.round(pnl / (tickValue * quantity));
  }

  return 0;
}

/**
 * Local scoring fallback – used only when backend hasn't populated
 * score/scoreTrend yet.
 */
function computeScoreLocally(
  canonical: any,
  riskDecision: TicketRiskDecision | null,
): number {
  if (!canonical) return 0;

  let score = 50;

  const rr =
    typeof canonical.rrMultiple === "number" && Number.isFinite(canonical.rrMultiple)
      ? canonical.rrMultiple
      : null;

  if (rr !== null) {
    if (rr >= 3) score += 20;
    else if (rr >= 2) score += 10;
    else if (rr < 1) score -= 10;
  }

  if (riskDecision) {
    if (!riskDecision.allowed) score -= 25;
    if (riskDecision.warnings && riskDecision.warnings.length > 0) score -= 5;
  }

  return normalizeScore(score);
}

/**
 * Local trend fallback – used only when backend hasn't populated
 * scoreTrend, just to avoid blanks.
 */
function deriveTrendLocally(
  canonical: any,
  riskDecision: TicketRiskDecision | null,
): WorklistTrend {
  const rr =
    typeof canonical?.rrMultiple === "number" && Number.isFinite(canonical.rrMultiple)
      ? canonical.rrMultiple
      : null;

  if (riskDecision && !riskDecision.allowed) return "DOWN";
  if (rr !== null) {
    if (rr >= 3) return "UP";
    if (rr < 1) return "DOWN";
  }
  return "FLAT";
}

/**
 * Try the canonical Worklist feed first.
 */
async function fetchWorklistJson(): Promise<ApiWorklistResponse | null> {
  if (typeof fetch !== "function") return null;

  try {
    const res = await fetch("/api/worklist");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as ApiWorklistResponse | null;
    if (!json || !Array.isArray(json.tickets)) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Main hook.
 */
export function useWorklistTickets(): UseWorklistTicketsResult {
  const [tickets, setTickets] = useState<WorklistTicket[]>([]);
  const [selected, setSelected] = useState<WorklistTicket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let sourceRows: any[] = [];

        // 1) Prefer canonical Worklist feed
        const worklistJson = await fetchWorklistJson();
        if (worklistJson && worklistJson.tickets.length > 0) {
          sourceRows = worklistJson.tickets;
        } else {
          // 2) Fallback to canonical tickets endpoint
          const { rows = [] } = await fetchTickets({
            status: "OPEN",
            scope: "actionable",
            direction: "ALL",
            limit: 100,
            offset: 0,
          });
          sourceRows = rows;
        }

        const mapped: WorklistTicket[] = [];

        for (const row of sourceRows) {
          // Prefer backend-provided canonical, fall back to builder from /api/tickets row
          const canonical =
            (row.canonical as any | undefined) ?? buildCanonicalTicketFromRow(row);

          if (!canonical) continue;

          const sessionMetrics =
            (row.sessionMetrics as SessionMetricsDto | null) ?? null;

          const sessionFlags =
            (row.sessionFlags as SessionFlagsSummary | null) ?? null;

          const riskDecision =
            (row.riskDecision as TicketRiskDecision | null) ?? null;

          const backendScore = normalizeScore(row.score);
          const backendTrend = normalizeTrend(row.scoreTrend);
          const backendDelta = normalizeTrend(row.scoreDelta);

          const score =
            backendScore > 0 || backendTrend !== "FLAT"
              ? backendScore
              : computeScoreLocally(canonical, riskDecision);

          const trend =
            row.scoreTrend === "UP" ||
            row.scoreTrend === "DOWN" ||
            row.scoreTrend === "FLAT"
              ? (row.scoreTrend as WorklistTrend)
              : deriveTrendLocally(canonical, riskDecision);

          const delta = backendDelta;

          const riskBucket = deriveRiskBucket(riskDecision);

          const createdAt: string | null =
            (row.createdAt as string | undefined) ??
            (row.opened_at_utc as string | undefined) ??
            (canonical.createdAtUtc as string | undefined) ??
            null;

          const ageMinutes =
            typeof row.ageMinutes === "number" && Number.isFinite(row.ageMinutes)
              ? row.ageMinutes
              : computeAgeMinutes(createdAt);

          const pnlTicks =
            typeof row.pnlTicks === "number" && Number.isFinite(row.pnlTicks)
              ? row.pnlTicks
              : computePnlTicksFromCanonical(canonical);

          const contracts =
            typeof row.contracts === "number"
              ? row.contracts
              : (canonical.quantity as number | undefined) ?? null;

          const rrMultiple =
            typeof row.rrMultiple === "number"
              ? row.rrMultiple
              : typeof canonical.rrMultiple === "number"
              ? canonical.rrMultiple
              : null;

          const riskDollars =
            typeof row.riskDollars === "number"
              ? row.riskDollars
              : typeof canonical.totalRisk === "number"
              ? canonical.totalRisk
              : null;

          const sessionDate: string =
            (row.sessionDate as string | undefined) ??
            (row.session_date_utc as string | undefined) ??
            (createdAt ? createdAt.slice(0, 10) : "") ??
            "";

          const ticketId: string =
            (row.ticketId as string | undefined) ??
            (row.id != null ? String(row.id) : "");

          const side: WorklistSide =
            (row.side as WorklistSide) ||
            (canonical.side as WorklistSide) ||
            "LONG";

          const notes: string | null =
            (row.notes as string | null | undefined) ??
            (canonical.notes as string | null | undefined) ??
            null;

          mapped.push({
            ticketId,
            symbol: row.symbol ?? canonical.symbol,
            strategy: row.strategy ?? canonical.strategy,
            side,
            score,
            trend,
            delta,
            contracts,
            rrMultiple,
            riskDollars,
            riskBucket,
            riskDecision,
            ageMinutes,
            pnlTicks,
            sessionDate,
            sessionMetrics,
            sessionFlags,
            canonical,
            notes,
          });
        }

        if (cancelled) return;

        setTickets(mapped);
        if (!selected || !mapped.some((t) => t.ticketId === selected.ticketId)) {
          setSelected(mapped[0] ?? null);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load Worklist tickets.");
        setTickets([]);
        setSelected(null);
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
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const refresh = () => setRefreshToken((x) => x + 1);

  const value: UseWorklistTicketsResult = useMemo(
    () => ({
      tickets,
      loading,
      error,
      selected,
      setSelected,
      refresh,
    }),
    [tickets, loading, error, selected],
  );

  return value;
}
