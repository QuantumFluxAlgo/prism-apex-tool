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

import { computePnL } from '@prism-apex/shared';
import { getSessionInfo } from './status.js';
import { getInstrumentSpec } from '../risk/contractMath.js';

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
  riskPoints: number | null;
  rewardPoints: number | null;
  rewardDollars: number | null;
  tickSize: number | null;
  tickValueUSD: number | null;

  entryPrice: number;
  stopPrice: number;
  targetPrice: number | null;

  createdAt: string;
  ticketTimeUtc: string;
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
async function fetchRawTickets(
  client: Client,
  q: WorklistQuery,
  sessionWindow: { openUtc: string; closeUtc: string },
) {
  const filters: string[] = ["actionable IS TRUE", "status = 'OPEN'", 'opened_at_utc IS NOT NULL'];
  const params: any[] = [];
  filters.push("opened_at_utc >= ((now() AT TIME ZONE 'utc') - INTERVAL '30 minutes')");
  filters.push("opened_at_utc <= (now() AT TIME ZONE 'utc')");
  params.push(sessionWindow.openUtc);
  filters.push(`opened_at_utc >= $${params.length}::timestamptz`);
  params.push(sessionWindow.closeUtc);
  filters.push(`opened_at_utc <= $${params.length}::timestamptz`);

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
      created_at_utc,
      completed_at_utc,
      session_date_utc,
      entry_price,
      stop_price,
      target_price,
      pnl,
      rr,
      meta,
      meta -> 'riskDecision' AS risk_decision
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

async function expireStaleTickets(client: Client): Promise<void> {
  await client.query(
    `
      UPDATE tickets
         SET status = 'EXPIRED',
             actionable = FALSE,
             non_actionable_reason = 'expired'
       WHERE status = 'OPEN'
         AND actionable IS TRUE
         AND (
           opened_at_utc IS NULL
           OR opened_at_utc < ((now() AT TIME ZONE 'utc') - INTERVAL '30 minutes')
         )
    `,
  );
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
        const sessionMeta = getSessionInfo();
        const sessionWindow = {
          openUtc: sessionMeta.session.open_utc,
          closeUtc: sessionMeta.session.close_utc,
        };

        await expireStaleTickets(client);
        const rows = await fetchRawTickets(client, req.query ?? {}, sessionWindow);

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

          const openedRaw = row.opened_at_utc;
          const ticketTimeUtc =
            typeof openedRaw === 'string'
              ? openedRaw
              : openedRaw instanceof Date
              ? openedRaw.toISOString()
              : openedRaw
              ? new Date(openedRaw as string).toISOString()
              : new Date().toISOString();
          const entryPrice =
            typeof row.entry_price === 'number' ? (row.entry_price as number) : null;
          const stopPrice =
            typeof row.stop_price === 'number' ? (row.stop_price as number) : null;
          const targetPrice =
            typeof row.target_price === 'number' ? (row.target_price as number) : null;

          const metaContracts =
            (meta.contracts as number | undefined) ?? (meta.qty as number | undefined);
          const canonicalContracts =
            typeof canonical?.quantity === 'number' && Number.isFinite(canonical.quantity)
              ? (canonical.quantity as number)
              : null;
          let normalizedContracts =
            typeof metaContracts === 'number' && Number.isFinite(metaContracts)
              ? metaContracts
              : canonicalContracts;

          let instrumentSpec: ReturnType<typeof getInstrumentSpec> | null = null;
          try {
            instrumentSpec = getInstrumentSpec(row.symbol);
          } catch {
            instrumentSpec = null;
          }

          const tickSize = instrumentSpec?.tickSize ?? null;
          const tickValueUSD = instrumentSpec?.dollarsPerTick ?? null;

          let recommendedQty =
            typeof normalizedContracts === 'number' && Number.isFinite(normalizedContracts)
              ? normalizedContracts
              : null;

          if (
            normalizedContracts === null ||
            !Number.isFinite(normalizedContracts as number)
          ) {
            recommendedQty = recommendedQty ?? 1;
            normalizedContracts = recommendedQty;
          }
          if (recommendedQty === null || !Number.isFinite(recommendedQty)) {
            recommendedQty = 1;
          }
          const qtyForRisk = Number.isFinite(recommendedQty)
            ? (recommendedQty as number)
            : 1;

          let riskDollars =
            (meta.riskDollars as number | undefined) ??
            (meta.risk_dollars as number | undefined) ??
            (canonical?.totalRisk ?? null);

          let derivedRiskPoints: number | null = null;
          let derivedRiskDollars: number | null = null;
          let derivedRewardPoints: number | null = null;
          let derivedRewardDollars: number | null = null;

          if (
            instrumentSpec &&
            entryPrice !== null &&
            stopPrice !== null &&
            Number.isFinite(entryPrice) &&
            Number.isFinite(stopPrice) &&
            instrumentSpec.tickSize > 0 &&
            instrumentSpec.dollarsPerTick > 0
          ) {
            const riskPts = Math.abs(entryPrice - stopPrice);
            const riskTicks = riskPts / instrumentSpec.tickSize;
            if (Number.isFinite(riskTicks)) {
              derivedRiskPoints = riskPts;
              derivedRiskDollars = Math.round(
                riskTicks * instrumentSpec.dollarsPerTick * qtyForRisk,
              );
            }
          }

          if (
            instrumentSpec &&
            entryPrice !== null &&
            targetPrice !== null &&
            Number.isFinite(entryPrice) &&
            Number.isFinite(targetPrice) &&
            instrumentSpec.tickSize > 0 &&
            instrumentSpec.dollarsPerTick > 0
          ) {
            const rewardPts = Math.abs(targetPrice - entryPrice);
            const rewardTicks = rewardPts / instrumentSpec.tickSize;
            if (Number.isFinite(rewardTicks)) {
              derivedRewardPoints = rewardPts;
              derivedRewardDollars = Math.round(
                rewardTicks * instrumentSpec.dollarsPerTick * qtyForRisk,
              );
            }
          }

          if (riskDollars == null && derivedRiskDollars !== null) {
            riskDollars = derivedRiskDollars;
          }

          const rrMultiple =
            (meta.rrMultiple as number | undefined) ??
            (meta.rr as number | undefined) ??
            (row.rr as number | undefined) ??
            (canonical?.rrMultiple ?? null);

          const createdRaw = row.created_at_utc;
          const createdAt =
            typeof createdRaw === 'string'
              ? createdRaw
              : createdRaw instanceof Date
              ? createdRaw.toISOString()
              : createdRaw
              ? new Date(createdRaw as string).toISOString()
              : ticketTimeUtc;

          return {
            ticketId: String(row.id),
            symbol: row.symbol,
            strategy: row.strategy,
            side: ((row.direction ?? 'LONG') as 'LONG' | 'SHORT') ?? 'LONG',

            contracts: normalizedContracts ?? null,
            riskDollars,
            rrMultiple,
            riskPoints: derivedRiskPoints,
            rewardPoints: derivedRewardPoints,
            rewardDollars: derivedRewardDollars,
            tickSize,
            tickValueUSD,

            entryPrice: row.entry_price,
            stopPrice: row.stop_price,
            targetPrice: row.target_price,

            createdAt,
            ticketTimeUtc,
            sessionDate: ticketTimeUtc.slice(0, 10),

            score,
            scoreTrend: trend,
            scoreDelta: 'FLAT', // Filled in a second pass below

            pnlTicks,
            ageMinutes: toMinutesAgo(ticketTimeUtc),

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
