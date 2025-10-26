import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Client } from 'pg';
import { listTickets } from '../store/tickets.js';
import { isMockDbEnabled, isTestMode } from '../utils/testMode.js';
import { TICKET_STRATEGIES, type TicketStrategy } from '../schemas/ticket.js';
import { readTickets } from '../utils/mockStore.js';

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

function normalizeStrategy(s?: string | null) {
  if (!s) return undefined;
  const key = s.trim().toLowerCase();
  return STRATEGY_ALIASES.has(key) ? ORR_STRATEGY_ID : s;
}

type TicketsRequest = FastifyRequest<{ Querystring: Query }>;

export default async function ticketsRoute(app: FastifyInstance) {
  const handler = async (req: TicketsRequest, reply: FastifyReply) => {
    const q = req.query ?? {};

    const limit = Math.max(0, Math.min(500, Number(q.limit ?? 50)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const scope = (q.scope ?? 'all').toLowerCase();
    const symbol = q.symbol && q.symbol !== 'ALL' ? q.symbol : undefined;
    const direction = q.direction && q.direction !== 'ALL' ? q.direction : undefined;
    const status = q.status && q.status !== 'ALL' ? q.status : undefined;
    const strategy = normalizeStrategy(q.strategy);
    const from = q.from;
    const to = q.to;

    if (strategy && !TICKET_STRATEGIES.includes(strategy as TicketStrategy)) {
      reply.code(400);
      return reply.send({ error: 'Invalid query' });
    }

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
      const total = countResult.rows[0]?.n ?? 0;
      return reply.send({ total, rows: rowsResult.rows, tickets: rowsResult.rows });
    } finally {
      await client.end();
    }
  };

  app.get('/tickets', handler);
  app.get('/api/tickets', handler);
}
