// @ts-nocheck
/* PRISM APEX – Worklist V2 data hook
 *
 * Front-end canonical DTO for worklist tickets, plus a small data hook that:
 * - Calls /api/worklist (engine-backed) when available.
 * - Falls back to the provided mock data when the engine is offline or payload is bad.
 *
 * This gives the dashboard a stable contract while the engine/backend wiring is finished.
 */

import { useEffect, useState } from "react";

export type WorklistSide = "LONG" | "SHORT";
export type WorklistRiskBucket = "GREEN" | "AMBER" | "RED";

export interface WorklistTicket {
  ticketId: string;
  symbol: string;
  strategy: "ORR" | "OSB" | "VWAP-FT";
  side: WorklistSide;
  score: number; // 0–100 engine score
  riskBucket: WorklistRiskBucket;
  ageMinutes: number; // minutes since creation
  pnlTicks: number; // positive/negative ticks
  sessionDate: string; // YYYY-MM-DD
  createdAt: string; // ISO
  notes?: string;
}

interface UseWorklistTicketsResult {
  tickets: WorklistTicket[];
  loading: boolean;
  error: Error | null;
}

/**
 * useWorklistTickets
 *
 * - Fetches from /api/worklist.
 * - Expects either:
 *   { tickets: WorklistTicket[] } OR { worklist: WorklistTicket[] } OR WorklistTicket[]
 * - On any failure, keeps / falls back to the supplied mock tickets.
 */
export function useWorklistTickets(options?: {
  autoLoad?: boolean;
  mockFallback?: WorklistTicket[];
}): UseWorklistTicketsResult {
  const { autoLoad = true, mockFallback = [] } = options ?? {};

  const [tickets, setTickets] = useState<WorklistTicket[]>(mockFallback);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoLoad) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // In test / offline environments, fetch may not be defined.
        if (typeof fetch !== "function") {
          throw new Error("fetch is not available; using mock fallback");
        }

        const res = await fetch("/api/worklist");
        if (!res.ok) {
          throw new Error(`Failed to fetch worklist: HTTP ${res.status}`);
        }

        const json: any = await res.json();

        const raw =
          (json && (json.tickets ?? json.worklist ?? json.rows)) ?? json;

        if (!Array.isArray(raw)) {
          throw new Error("Unexpected worklist payload shape");
        }

        const mapped: WorklistTicket[] = raw.map((r: any) => {
          const ticketId = String(r.ticketId ?? r.id ?? "");
          const symbol = String(r.symbol ?? "");
          const strategy = (r.strategy ?? "ORR") as "ORR" | "OSB" | "VWAP-FT";
          const side = (r.side ?? "LONG") as WorklistSide;
          const score = Number(r.score ?? 0);
          const riskBucket = (r.riskBucket ?? "GREEN") as WorklistRiskBucket;
          const ageMinutes = Number(r.ageMinutes ?? 0);
          const pnlTicks = Number(r.pnlTicks ?? 0);
          const sessionDate = String(r.sessionDate ?? "").slice(0, 10);
          const createdAt = String(r.createdAt ?? r.created_at ?? "");
          const notes = (r.notes ?? r.comment ?? undefined) as
            | string
            | undefined;

          return {
            ticketId,
            symbol,
            strategy,
            side,
            score,
            riskBucket,
            ageMinutes,
            pnlTicks,
            sessionDate,
            createdAt,
            notes,
          };
        });

        if (!cancelled) {
          setTickets(mapped);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          // Keep whatever tickets we already had (mockFallback by default).
          setError(err instanceof Error ? err : new Error(String(err)));
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
  }, [autoLoad]);

  return { tickets, loading, error };
}

