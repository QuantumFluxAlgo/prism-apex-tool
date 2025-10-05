import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

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
};

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
  return STRATEGY_ALIASES.has(key) ? 'ORR' : s;
}

export default async function ticketsRoute(app: FastifyInstance) {
  const handler = async (req: { query?: Query }, reply: any) => {
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

    const rowsSql = `
      SELECT id, symbol, strategy, direction, status,
             opened_at_utc, closed_at_utc,
             entry_price, stop_price, target_price, pnl, rr,
             actionable, non_actionable_reason AS reason,
             completed_by, completed_note, completed_at_utc
        FROM tickets
        ${whereSql}
        ORDER BY opened_at_utc DESC
        LIMIT ${limit} OFFSET ${offset}
    `;
    const countSql = `SELECT COUNT(*)::int AS n FROM tickets ${whereSql}`;

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const [rowsResult, countResult] = await Promise.all([
        client.query(rowsSql, params),
        client.query(countSql, params),
      ]);
      const total = countResult.rows[0]?.n ?? 0;
      return reply.send({ total, rows: rowsResult.rows });
    } finally {
      await client.end();
    }
  };

  app.get('/tickets', handler);
  app.get('/api/tickets', handler);
}
