/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.
/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Client } from 'pg';
import type { CanonicalCandidateTicket } from '@prism-apex/shared';
import { buildCanonicalApprovedTicketView } from './dto/canonicalTicketView.js';
import { listTickets } from '../store/tickets.js';
import { isMockDbEnabled, isTestMode } from '../utils/testMode.js';
import { TICKET_STRATEGIES, type TicketStrategy } from '../schemas/ticket.js';
import { readTickets } from '../utils/mockStore.js';
import {
  attachSessionMetricsToRows,
  DEFAULT_MAX_SESSION_METRICS_KEYS,
  fetchSessionMetricsBatch,
  sessionMetricsKeyToString,
  type SessionMetricsKey,
  type SessionMetricsSummary,
} from '../jobs/session-metrics/batch.js';
import {
  createSessionFlagsService,
  type SessionFlagsSummary,
} from '../jobs/session-metrics/session-flags-service.js';
import type { TicketRiskDecisionDto } from './dto/riskDecisionDto.js';
import { applyQualityFilters, parseTicketQualityFilters } from './ticketQualityFilters.js';
import { emitTicketQualityTelemetry } from '../services/tickets/ticketsTelemetry.js';

type Query = {
  limit?: string;
  offset?: string;
  from?: string;
  to?: string;
  symbol?: string;
  strategy?: string;
  status?: string;
  direction?: string;
  scope?: string;
  date?: string;
  cursor?: string;
  minEntryRR?: string;
  maxEntryRR?: string;
  minActualRR?: string;
  maxActualRR?: string;
  minRiskDollars?: string;
  maxRiskDollars?: string;
  minActualPnLDollars?: string;
  maxActualPnLDollars?: string;
};

const ORR_STRATEGY_ID = 'APX-DDB-01';
const STRATEGY_ALIASES = new Set([
  'orr',
  'open-range-retest',
  'open range retest',
  'apx-ddb-01',
  'apx_ddb_01',
  'apxddb01',
]);

const sessionFlagsService = createSessionFlagsService();

function normalizeStrategy(s?: string | null) {
  if (!s) return undefined;
  const key = s.trim().toLowerCase();
  return STRATEGY_ALIASES.has(key) ? ORR_STRATEGY_ID : s;
}

type TicketsRequest = FastifyRequest<{ Querystring: Query }>;

export type TicketRowDto = {
  sessionMetrics: SessionMetricsSummary | null;
  sessionFlags: SessionFlagsSummary | null;
  riskDecision?: TicketRiskDecisionDto | null;
  contracts?: number | null;
  riskDollars?: number | null;
  rewardDollars?: number | null;
  rrMultiple?: number | null;
  canonicalCandidate?: CanonicalCandidateTicket | null;
  canonicalApproved?: ReturnType<typeof buildCanonicalApprovedTicketView>;
} & Record<string, unknown>;

const DEFAULT_RISK_DECISION: TicketRiskDecisionDto = {
  allowed: true,
  reason: 'Not evaluated (Phase 3.5 placeholder)',
  codes: ['OK'],
  maxContractsAllowed: null,
  warnings: [],
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function attachRiskFields(row: any): any {
  const meta = row?.meta && typeof row.meta === 'object' ? (row.meta as Record<string, unknown>) : {};
  const contracts = row.contracts ?? toNumber(meta.contracts);
  const riskDollars =
    row.riskDollars ?? row.risk_dollars ?? toNumber(meta.riskDollars ?? meta.risk_dollars);
  const rewardDollars =
    row.rewardDollars ?? row.reward_dollars ?? toNumber(meta.rewardDollars ?? meta.reward_dollars);
  const rrMultiple =
    row.rrMultiple ??
    row.rr_multiple ??
    toNumber(meta.rrMultiple ?? meta.rr_multiple ?? meta.rr ?? row.rr);

  const canonicalCandidate = meta.canonicalCandidate as CanonicalCandidateTicket | undefined;

  const canonicalApproved = buildCanonicalApprovedTicketView(row);

  return {
    ...row,
    contracts: contracts ?? null,
    riskDollars: riskDollars ?? null,
    rewardDollars: rewardDollars ?? null,
    rrMultiple: rrMultiple ?? null,
    canonicalCandidate: canonicalCandidate ?? null,
    canonicalApproved: canonicalApproved ?? null,
  };
}

export default async function ticketsRoute(app: FastifyInstance) {
  const handler = async (req: TicketsRequest, reply: FastifyReply) => {
    const q = req.query ?? {};

    const limit = Math.max(0, Math.min(500, Number(q.limit ?? 50)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const scope = (q.scope ?? 'all').toLowerCase();
    const symbol = q.symbol && q.symbol !== 'ALL' ? q.symbol.trim() : undefined;
    const direction =
      q.direction && q.direction !== 'ALL' ? q.direction.trim().toUpperCase() : undefined;
    const status = q.status && q.status !== 'ALL' ? q.status : undefined;
    const strategy = normalizeStrategy(q.strategy);
    const from = q.from;
    const to = q.to;

    if (strategy && !TICKET_STRATEGIES.includes(strategy as TicketStrategy)) {
      reply.code(400);
      return reply.send({ error: 'Invalid query' });
    }

    const qualityFilters = parseTicketQualityFilters(q);

    if (isTestMode() && !q.date && !q.from && !q.to) {
      const cursorIso = typeof q.cursor === 'string' && q.cursor ? q.cursor : undefined;
      const after = cursorIso ? Date.parse(cursorIso) : undefined;
      const all = readTickets(limit + 1);
      const filtered = after ? all.filter((t) => Date.parse(t.ts) > after) : all;
      const page = filtered.slice(0, limit);
      const nextCursor = filtered.length > page.length ? page[page.length - 1]?.ts ?? null : null;
      return reply.send({ total: filtered.length, rows: page, tickets: page, nextCursor });
    }

    const where: string[] = [];
    const params: any[] = [];

    const add = (cond: string, value?: any) => {
      if (value === undefined || value === null || value === '') return;
      params.push(value);
      where.push(cond.replace('?', `$${params.length}`));
    };

    if (scope === 'actionable') where.push('actionable IS TRUE');
    add('symbol = ?', symbol);
    add('direction = ?', direction);
    add('status = ?', status);
    add('strategy = ?', strategy);
    add('opened_at_utc >= ?', from);
    add('opened_at_utc <= ?', to);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const baseDistinct = `
      SELECT DISTINCT ON (symbol, strategy, direction, opened_at_utc)
        id, symbol, strategy, direction, status,
        opened_at_utc, closed_at_utc,
        entry_price, stop_price, target_price, pnl, rr,
        actionable, non_actionable_reason AS reason,
        completed_by, completed_note, completed_at_utc
      FROM tickets
      ${whereSql}
      ORDER BY symbol, strategy, direction, opened_at_utc DESC, completed_at_utc DESC NULLS LAST, id DESC
    `;

    const rowsSql = `
      WITH ranked AS (
        ${baseDistinct}
      )
      SELECT *
      FROM ranked
      ORDER BY opened_at_utc DESC, completed_at_utc DESC NULLS LAST, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS n
      FROM (
        ${baseDistinct}
      ) AS distinct_rows
    `;

    if (isMockDbEnabled()) {
      const date = q.date || q.from?.slice(0, 10);
      if (!date) {
        reply.code(400);
        return reply.send({ error: 'date query param required in mock mode' });
      }
      const cursor = Math.max(0, Number(q.cursor ?? offset ?? 0));
      const { items, nextCursor } = listTickets(date, cursor, limit, strategy);
      const payload = {
        total: items.length,
        rows: items,
        tickets: items,
        nextCursor: nextCursor ?? null,
      };
      return reply.send(payload);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const [rowsResult, countResult] = await Promise.all([
        client.query(rowsSql, params),
        client.query(countSql, params),
      ]);
      const ticketsWithMetrics = await populateSessionMetricsForTickets(rowsResult.rows);
      const filteredTickets = applyQualityFilters(ticketsWithMetrics, qualityFilters);
      const total = filteredTickets.length;

      emitTicketQualityTelemetry({
        route: 'tickets',
        filters: qualityFilters,
        totalBefore: ticketsWithMetrics.length,
        totalAfter: total,
        symbol,
        direction,
        status,
      });

      return reply.send({ total, rows: filteredTickets, tickets: filteredTickets });
    } finally {
      await client.end();
    }
  };

  app.get('/tickets', handler);
  app.get('/api/tickets', handler);
}


const MAX_SESSION_METRICS_KEYS = DEFAULT_MAX_SESSION_METRICS_KEYS;

function getSessionKeyFromRow(row: any): SessionMetricsKey | null {
  const symbol = row.symbol;
  if (!symbol) return null;

  const rawDate =
    row.session_date_utc ??
    (typeof row.opened_at_utc === 'string' ? row.opened_at_utc.slice(0, 10) : null);

  if (!rawDate) return null;
  return { symbol, sessionDate: rawDate.slice(0, 10) };
}

const createEmptySessionFlags = (): SessionFlagsSummary => ({
  flags: [],
  hasNewsFlag: false,
});

function getSessionFlagsForRow(row: any): SessionFlagsSummary {
  const key = getSessionKeyFromRow(row);
  if (!key) return createEmptySessionFlags();
  return sessionFlagsService.getFlagsForSession(key.symbol, key.sessionDate);
}

async function populateSessionMetricsForTickets(rows: any[]): Promise<TicketRowDto[]> {
  const baseTickets = rows.map((row) => {
    const withRisk = attachRiskFields(row);
    return {
      ...withRisk,
      sessionMetrics: null,
      sessionFlags: getSessionFlagsForRow(withRisk),
      riskDecision: (withRisk.riskDecision as TicketRiskDecisionDto | null) ?? DEFAULT_RISK_DECISION,
    } as TicketRowDto;
  });

  const keyList: SessionMetricsKey[] = [];
  const seen = new Set<string>();

  for (const ticket of baseTickets) {
    const key = getSessionKeyFromRow(ticket);
    if (!key) continue;
    const keyStr = sessionMetricsKeyToString(key);
    if (seen.has(keyStr)) continue;
    seen.add(keyStr);
    keyList.push(key);
    if (keyList.length > MAX_SESSION_METRICS_KEYS) {
      return baseTickets;
    }
  }

  if (!keyList.length) {
    return baseTickets;
  }

  const summaryMap = await fetchSessionMetricsBatch(keyList, {
    maxKeys: MAX_SESSION_METRICS_KEYS,
  });

  return attachSessionMetricsToRows(baseTickets, summaryMap, (ticket) => getSessionKeyFromRow(ticket));
}
