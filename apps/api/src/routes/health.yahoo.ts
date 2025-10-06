import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

export default async function yahooHealthRoute(app: FastifyInstance) {
  const handler = async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const { rows } = await client.query(`
        SELECT symbol,
               MAX(ts_utc) AS last_bar,
               EXTRACT(EPOCH FROM (NOW() - MAX(ts_utc)))/60 AS minutes_behind
          FROM bars_1m
         GROUP BY 1
         ORDER BY 1;
      `);
      const status = rows.every((r) => r.minutes_behind < 20)
        ? 'ok'
        : rows.some((r) => r.minutes_behind < 60)
          ? 'degraded'
          : 'down';
      return { status, rows };
    } finally {
      await client.end();
    }
  };

  app.get('/health/yahoo', handler);
  app.get('/api/health/yahoo', handler);
}
