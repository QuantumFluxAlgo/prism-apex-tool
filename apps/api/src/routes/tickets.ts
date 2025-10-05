import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

export default async function ticketsRoute(app: FastifyInstance) {
  app.get('/api/tickets', async (req, reply) => {
    const url = new URL(req.protocol + '://' + req.hostname + req.url);
    const q = url.searchParams;
    const limit = Math.min(Number(q.get('limit') ?? '100'), 500);
    const offset = Math.max(Number(q.get('offset') ?? '0'), 0);
    const from = q.get('from');
    const to = q.get('to');

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

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

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    params.push(limit, offset);
    const dataSql = `
      SELECT symbol, strategy, direction, session_date_utc, opened_at_utc, closed_at_utc,
             entry_price, exit_price, stop_price, target_price, pnl, meta
      FROM tickets
      ${whereSql}
      ORDER BY opened_at_utc ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const rows = (await client.query(dataSql, params)).rows;

    const countSql = `SELECT COUNT(*)::int AS n FROM tickets ${whereSql}`;
    const total = (await client.query(countSql, params.slice(0, params.length - 2))).rows[0]?.n ?? 0;

    await client.end();

    return reply.send({ total, rows });
  });
}
