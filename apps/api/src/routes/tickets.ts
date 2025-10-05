import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

export default async function ticketsRoute(app: FastifyInstance) {
  const handler = async (req: any, reply: any) => {
    const url = new URL(req.protocol + '://' + req.hostname + req.url);
    const q = url.searchParams;

    const limit = Math.min(Number(q.get('limit') ?? '100'), 500);
    const offset = Math.max(Number(q.get('offset') ?? '0'), 0);
    const from = q.get('from');
    const to = q.get('to');
    const symbol = q.get('symbol');
    const strategy = q.get('strategy');
    const status = q.get('status');

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const where: string[] = [];
      const params: any[] = [];

      if (from) {
        params.push(from);
        where.push(`opened_at_utc >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        where.push(`opened_at_utc <= $${params.length}`);
      }
      if (symbol && symbol !== 'ALL') {
        params.push(symbol);
        where.push(`symbol = $${params.length}`);
      }
      if (strategy && strategy !== 'ALL') {
        params.push(strategy);
        where.push(`strategy = $${params.length}`);
      }
      if (status && status !== 'ANY') {
        params.push(status);
        where.push(`status = $${params.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      params.push(limit, offset);
      const selectSql = `
        SELECT id, symbol, strategy, direction, status, session_date_utc,
               opened_at_utc, closed_at_utc, entry_price, exit_price,
               stop_price, target_price, pnl, meta,
               completed_at_utc, completed_by, completed_note
          FROM tickets
          ${whereSql}
         ORDER BY opened_at_utc ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const rows = (await client.query(selectSql, params)).rows;

      const countParams = params.slice(0, params.length - 2);
      const countSql = `SELECT COUNT(*)::int AS n FROM tickets ${whereSql}`;
      const total = (await client.query(countSql, countParams)).rows[0]?.n ?? 0;

      return reply.send({ total, rows });
    } finally {
      await client.end();
    }
  };

  app.get('/tickets', handler);
  app.get('/api/tickets', handler);
}
