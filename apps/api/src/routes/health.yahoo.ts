import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

function num(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

/**
 * Thresholds (minutes)
 * - OK if every symbol < OK_LAG
 * - DEGRADED if some < DEGRADED_LAG (but not all < OK_LAG)
 * - DOWN if any >= DEGRADED_LAG
 *
 * Tune via env:
 *   YAHOO_OK_LAG_MIN (default 25)
 *   YAHOO_DEGRADED_LAG_MIN (default 90)
 */
const OK_LAG = num(process.env.YAHOO_OK_LAG_MIN, 25);
const DEG_LAG = num(process.env.YAHOO_DEGRADED_LAG_MIN, 90);

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

  async function handle(reply: any) {
    const rows = await queryRows();

    // Optional: if it’s the weekend and everything is very stale, call it "paused"
    const now = new Date();
    const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
    const allVeryStale = rows.length > 0 && rows.every((r) => r.minutes_behind >= 720); // 12h+
    let status: 'ok' | 'degraded' | 'down' | 'paused';

    if (isWeekend && allVeryStale) {
      status = 'paused';
    } else if (rows.every((r) => r.minutes_behind < OK_LAG)) {
      status = 'ok';
    } else if (rows.some((r) => r.minutes_behind < DEG_LAG)) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    return reply.send({
      status,
      ok_lag_min: OK_LAG,
      degraded_lag_min: DEG_LAG,
      rows,
      now_utc: now.toISOString(),
    });
  }

  app.get('/api/health/yahoo', async (_req, reply) => handle(reply));
  app.get('/health/yahoo', async (_req, reply) => handle(reply)); // non-prefixed twin
}
export default yahooHealthRoutes;
