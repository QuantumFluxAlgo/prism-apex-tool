// apps/api/src/routes/worklist.ts

/* PRISM APEX – Worklist V2 backend
 *
 * Canonical Worklist feed for operator cockpit.
 *
 * Goals:
 * - Replace mock data with DB-backed tickets.
 * - Reuse canonical ticket + session metrics + scoring logic.
 * - Surface risk decision, session flags, PnL ticks, score & scoreDelta.
 *
 * This route is read-only and non-invasive:
 * - No schema changes.
 * - Uses existing `tickets` table and session metrics jobs.
 */

import { Client } from 'pg';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { computeEngineTicketScoreFromRow } from '../services/tickets/engineTicketScore.js';
import { buildCanonicalApprovedTicketView } from './dto/canonicalTicketView.js';
import {
  fetchSessionMetricsBatch,
  sessionMetricsKeyToString,
  type SessionMetricsKey,
} from '../jobs/session-metrics/batch.js';
import { createSessionFlagsService } from '../jobs/session-metrics/session-flags-service.js';
import type { TicketRiskDecisionDto } from './dto/riskDecisionDto.js';

import { computePnL } from '@prism-apex/shared/pnl';

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';

const sessionFlagsService = createSessionFlagsService();

export interface WorklistTicketDto {
  ticketId: string;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';

  contracts: number | null;
  riskDollars: number | null;
  rrMultiple: number | null;

  entryPrice: number;
  stopPrice: number;
  targetPrice: number | null;

  createdAt: string;
  sessionDate: string;

  // Engine scoring
  score: number; // 0–100
  scoreTrend: 'UP' | 'FLAT' | 'DOWN';
  scoreDelta: 'UP' | 'FLAT' | 'DOWN';

  // PnL / time
  pnlTicks: number;
  ageMinutes: number;

  // Risk + context
  riskDecision: TicketRiskDecisionDto | null;
  sessionMetrics: Record<string, unknown> | null;
  sessionFlags: ReturnType<typeof sessionFlagsService.getFlagsForSession> | null;

  // Canonical ticket view
  canonical: ReturnType<typeof buildCanonicalApprovedTicketView> | null;

  // Operator notes
  notes?: string;
}

type WorklistQuery = {
  symbol?: string;
  strategy?: string;
  limit?: string;
};

/**
 * Compute minutes since createdAt (UTC ISO string).
 */
function toMinutesAgo(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

/**
 * Derive pnlTicks from canonical view + pnl where possible.
 */
function computePnlTicksFromCanonical(canonical: any, pnl: number | null): number {
  if (!canonical) return 0;

  const stopTicks = canonical.stopTicks;
  const perContractRisk = canonical.perContractRisk;
  const qty = canonical.quantity ?? 1;

  if (
    !Number.isFinite(stopTicks) ||
    !Number.isFinite(perContractRisk) ||
    stopTicks <= 0
  ) {
    return 0;
  }

  const tickValue = perContractRisk / stopTicks;
  if (!Number.isFinite(tickValue) || tickValue <= 0) return 0;

  if (Number.isFinite(pnl)) {
    return Math.round((pnl as number) / (tickValue * qty));
  }

  const entry = canonical.entryPrice;
  const target = canonical.targetPrice;
  const stop = canonical.stopPrice;

  if ([entry, target, stop].some((v: number) => typeof v !== 'number')) {
    return 0;
  }

  const result = computePnL({
    entryPrice: entry,
    targetPrice: target,
    stopPrice: stop,
    direction: canonical.side,
    tickSize: tickValue / qty,
    tickValueUSD: tickValue,
  });

  if (!result.ok || !Number.isFinite(result.ticksToTarget)) return 0;
  return result.ticksToTarget as number;
}

/**
 * Pulls latest actionable OPEN tickets from `tickets` with a DISTINCT ON
 * to dedupe per (symbol, strategy, direction, opened_at_utc).
 */
async function fetchRawTickets(client: Client, q: WorklistQuery) {
  const filters: string[] = ["actionable IS TRUE", "status = 'OPEN'"];
  const params: any[] = [];

  const addFilter = (sql: string, value?: any) => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    filters.push(sql.replace('?', `$${params.length}`));
  };

  addFilter('symbol = ?', q.symbol);
  addFilter('strategy = ?', q.strategy);

  const limit = Math.max(
    1,
    Math.min(200, Number.parseInt(q.limit ?? '100', 10) || 100),
  );

  const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const baseDistinct = `
    SELECT DISTINCT ON (symbol, strategy, direction, opened_at_utc)
      id,
      symbol,
      strategy,
      direction,
      status,
      actionable,
      opened_at_utc,
      completed_at_utc,
      session_date_utc,
      entry_price,
      stop_price,
      target_price,
      pnl,
      rr,
      risk_decision,
      meta
    FROM tickets
    ${whereSql}
    ORDER BY symbol,
             strategy,
             direction,
             opened_at_utc DESC,
             completed_at_utc DESC NULLS LAST,
             id DESC
  `;

  const sql = `
    WITH ranked AS (${baseDistinct})
    SELECT *
    FROM ranked
    ORDER BY opened_at_utc DESC, id DESC
    LIMIT ${limit}
  `;

  const res = await client.query(sql, params);
  return res.rows;
}

function getSessionKey(row: any): SessionMetricsKey | null {
  if (!row.symbol) return null;

  const rawDate =
    row.session_date_utc ??
    (typeof row.opened_at_utc === 'string'
      ? (row.opened_at_utc as string).slice(0, 10)
      : null);

  if (!rawDate) return null;

  return { symbol: row.symbol, sessionDate: rawDate };
}

/**
 * Main route registration.
 */
export default async function worklistRoute(app: FastifyInstance) {
  app.get(
    '/api/worklist',
    async (req: FastifyRequest<{ Querystring: WorklistQuery }>, reply) => {
      const client = new Client({ connectionString: DEFAULT_DATABASE_URL });

      await client.connect();
      try {
        const rows = await fetchRawTickets(client, req.query ?? {});

        // Build unique session keys for batch session metrics lookup
        const sessionKeys: SessionMetricsKey[] = [];
        const seen = new Set<string>();

        for (const row of rows) {
          const key = getSessionKey(row);
          if (!key) continue;
          const keyStr = sessionMetricsKeyToString(key);
          if (seen.has(keyStr)) continue;
          seen.add(keyStr);
          sessionKeys.push(key);
        }

        const metricsMap =
          sessionKeys.length > 0
            ? await fetchSessionMetricsBatch(sessionKeys, { maxKeys: 64 })
            : {};

        const now = new Date();

        const tickets: WorklistTicketDto[] = rows.map((row) => {
          const canonical = buildCanonicalApprovedTicketView(row);
          const riskDecision =
            (row.risk_decision as TicketRiskDecisionDto | null) ?? null;

          const sessionKey = getSessionKey(row);
          const metricsKey =
            sessionKey && sessionMetricsKeyToString(sessionKey);

          const sessionMetrics =
            metricsKey && metricsMap[metricsKey]
              ? (metricsMap[metricsKey] as Record<string, unknown>)
              : null;

          const sessionFlags =
            sessionKey !== null
              ? sessionFlagsService.getFlagsForSession(
                  sessionKey.symbol,
                  sessionKey.sessionDate,
                )
              : sessionFlagsService.getFlagsForSession(
                  row.symbol,
                  now.toISOString().slice(0, 10),
                );

          const { score, trend } = computeEngineTicketScoreFromRow({
            ...row,
            sessionMetrics,
            riskDecision,
            canonicalApproved: canonical,
          });

          const pnlTicks = computePnlTicksFromCanonical(
            canonical,
            row.pnl ?? null,
          );

          const meta = (row.meta ?? {}) as Record<string, unknown>;

          const contracts = (meta.contracts as number | undefined) ?? null;
          const riskDollars =
            (meta.riskDollars as number | undefined) ??
            (meta.risk_dollars as number | undefined) ??
            null;
          const rrMultiple =
            (meta.rrMultiple as number | undefined) ??
            (meta.rr as number | undefined) ??
            (row.rr as number | undefined) ??
            null;

          const createdAt = row.opened_at_utc as string;

          return {
            ticketId: String(row.id),
            symbol: row.symbol,
            strategy: row.strategy,
            side: ((row.direction ?? 'LONG') as 'LONG' | 'SHORT') ?? 'LONG',

            contracts,
            riskDollars,
            rrMultiple,

            entryPrice: row.entry_price,
            stopPrice: row.stop_price,
            targetPrice: row.target_price,

            createdAt,
            sessionDate: createdAt.slice(0, 10),

            score,
            scoreTrend: trend,
            scoreDelta: 'FLAT', // Filled in a second pass below

            pnlTicks,
            ageMinutes: toMinutesAgo(createdAt),

            riskDecision,
            sessionMetrics,
            sessionFlags,
            canonical,

            notes: (meta.notes as string | undefined) ?? undefined,
          };
        });

        // Second pass: compute scoreDelta per (symbol, strategy) stream
        const lastScoreByKey = new Map<string, number>();

        for (const ticket of tickets) {
          const key = `${ticket.symbol}|${ticket.strategy}`;
          const prev = lastScoreByKey.get(key);

          if (typeof prev === 'number') {
            if (ticket.score > prev) {
              ticket.scoreDelta = 'UP';
            } else if (ticket.score < prev) {
              ticket.scoreDelta = 'DOWN';
            } else {
              ticket.scoreDelta = 'FLAT';
            }
          }

          lastScoreByKey.set(key, ticket.score);
        }

        return reply.send({ total: tickets.length, tickets });
      } finally {
        await client.end();
      }
    },
  );

  // Legacy path kept only to guide callers to canonical API.
  app.get('/worklist', async (_req, reply) =>
    reply.send({ warning: 'Use /api/worklist for Worklist V2 feed.' }),
  );
}
