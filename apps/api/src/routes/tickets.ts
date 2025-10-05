import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

type Scope = 'all' | 'actionable';

type QueryParams = {
  limit?: string | number;
  offset?: string | number;
  scope?: string;
  symbol?: string;
  strategy?: string;
  status?: string;
  direction?: string;
  from?: string;
  to?: string;
};

export default async function ticketsRoute(app: FastifyInstance) {
  const handler = async (req: { query?: QueryParams; protocol: string; hostname: string; url: string }, reply: any) => {
    const query = req.query ?? {};

    const limit = Math.min(Number(query.limit ?? '100') || 100, 500);
    const offset = Math.max(Number(query.offset ?? '0') || 0, 0);
    const scope = ((query.scope ?? 'all') as string).toLowerCase() as Scope;
    const symbol = (query.symbol ?? 'ALL').toString();
    const strategy = (query.strategy ?? 'ALL').toString();
    const status = (query.status ?? 'ALL').toString().toUpperCase();
    const direction = (query.direction ?? 'ALL').toString().toUpperCase();

    const fromRaw = query.from ? new Date(query.from) : null;
    const toRaw = query.to ? new Date(query.to) : null;
    const fromIso = fromRaw && !Number.isNaN(fromRaw.getTime()) ? fromRaw.toISOString() : null;
    const toIso = toRaw && !Number.isNaN(toRaw.getTime()) ? toRaw.toISOString() : null;

    const where: string[] = [];
    const params: any[] = [];

    if (scope === 'actionable') {
      where.push('actionable = true');
    }
    if (symbol !== 'ALL') {
      params.push(symbol);
      where.push(`symbol = $${params.length}`);
    }
    if (strategy !== 'ALL') {
      params.push(strategy);
      where.push(`strategy = $${params.length}`);
    }
    if (status !== 'ALL') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (direction !== 'ALL') {
      params.push(direction);
      where.push(`direction = $${params.length}`);
    }
    if (fromIso) {
      params.push(fromIso);
      where.push(`opened_at_utc >= $${params.length}`);
    }
    if (toIso) {
      params.push(toIso);
      where.push(`opened_at_utc <= $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const selectSql = `
      SELECT id, symbol, strategy, direction, status, session_date_utc,
             opened_at_utc, closed_at_utc,
             entry_price, stop_price, target_price, pnl,
             rr, actionable, meets_strategy_params, meets_apex_rules,
             is_duplicate, reasons, strategy_version,
             completed_at_utc, completed_by, completed_note
        FROM tickets
        ${whereSql}
        ORDER BY opened_at_utc DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS n FROM tickets ${whereSql}`;

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const [countResult, rowsResult] = await Promise.all([
        client.query(countSql, params),
        client.query(selectSql, [...params, limit, offset]),
      ]);

      const total = countResult.rows[0]?.n ?? 0;
      const rows = rowsResult.rows;

      return reply.send({ total, rows });
    } finally {
      await client.end();
    }
  };

  app.get('/tickets', handler);
  app.get('/api/tickets', handler);
}
