import type { FastifyInstance, FastifyReply } from 'fastify';
import { Client } from 'pg';
import { classifyYahooStatus } from '../lib/yahooHealth.js';

export async function yahooHealthRoutes(app: FastifyInstance) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    app.get('/api/health/yahoo', async (_, reply) =>
      reply.code(500).send({ status: 'down', error: 'DATABASE_URL missing' }),
    );
    app.get('/health/yahoo', async (_, reply) =>
      reply.code(500).send({ status: 'down', error: 'DATABASE_URL missing' }),
    );
    return;
  }

  // We do a short-lived client per request; fast enough for health.
  async function queryRows(): Promise<{ symbol: string; last_bar_utc: string; minutes_behind: number }[]> {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const res = await client.query(`
        WITH last AS (
          SELECT symbol, MAX(ts_utc) AS last_bar
          FROM bars_1m
          GROUP BY symbol
        )
        SELECT
          symbol,
          last_bar AS last_bar_utc,
          EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - last_bar)) / 60.0 AS minutes_behind
        FROM last
        ORDER BY symbol ASC;
      `);
      return res.rows.map((r) => ({
        symbol: r.symbol,
        last_bar_utc: new Date(r.last_bar_utc).toISOString(),
        minutes_behind: Number(r.minutes_behind),
      }));
    } finally {
      await client.end().catch(() => {});
    }
  }

  async function handle(reply: FastifyReply) {
    const rows = await queryRows();
    const summary = classifyYahooStatus(rows);
    return reply.send(summary);
  }

  app.get('/api/health/yahoo', async (_req, reply) => handle(reply));
  app.get('/health/yahoo', async (_req, reply) => handle(reply)); // non-prefixed twin
}
export default yahooHealthRoutes;
