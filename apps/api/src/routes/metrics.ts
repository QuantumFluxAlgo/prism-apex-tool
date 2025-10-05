import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

type BarsSummary = Record<string, {
  count: number;
  minTsUtc: string | null;
  maxTsUtc: string | null;
}>;

type Metrics = {
  bars: BarsSummary;
  tickets: { total: number | null; today: number | null };
  lastIngestUtc: string | null;
  dbConnected: boolean;
};

async function fetchMetrics(): Promise<Metrics> {
  const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
  const pg = new Client({ connectionString: DATABASE_URL });

  const bars: BarsSummary = {};
  let totalTickets: number | null = null;
  let todayTickets: number | null = null;
  let lastIngestUtc: string | null = null;
  let dbConnected = false;

  try {
    await pg.connect();
    dbConnected = true;

    const hasBars = await pg.query(`SELECT to_regclass('public.bars_1m') IS NOT NULL AS exists`);
    if (hasBars.rows[0]?.exists) {
      const res = await pg.query(
        `SELECT symbol, COUNT(*)::int AS n, MIN(ts_utc) AS min_ts, MAX(ts_utc) AS max_ts
         FROM bars_1m
         GROUP BY symbol
         ORDER BY symbol`
      );
      for (const row of res.rows) {
        bars[row.symbol] = {
          count: row.n,
          minTsUtc: row.min_ts ? new Date(row.min_ts).toISOString() : null,
          maxTsUtc: row.max_ts ? new Date(row.max_ts).toISOString() : null
        };
      }
    }

    const hasTickets = await pg.query(`SELECT to_regclass('public.tickets') IS NOT NULL AS exists`);
    if (hasTickets.rows[0]?.exists) {
      const total = await pg.query(`SELECT COUNT(*)::int AS n FROM tickets`);
      totalTickets = total.rows[0]?.n ?? null;
      const today = await pg.query(
        `SELECT COUNT(*)::int AS n
         FROM tickets
         WHERE opened_at::date = (now() AT TIME ZONE 'UTC')::date`
      );
      todayTickets = today.rows[0]?.n ?? null;
    }

    const hasIngest = await pg.query(`SELECT to_regclass('public.ingest_log') IS NOT NULL AS exists`);
    if (hasIngest.rows[0]?.exists) {
      const last = await pg.query(`SELECT MAX(fetched_at) AS ts FROM ingest_log`);
      if (last.rows[0]?.ts) {
        lastIngestUtc = new Date(last.rows[0].ts).toISOString();
      }
    }
  } catch {
    // keep graceful defaults
  } finally {
    try {
      await pg.end();
    } catch {
      // ignore
    }
  }

  return {
    bars,
    tickets: { total: totalTickets, today: todayTickets },
    lastIngestUtc,
    dbConnected
  };
}

export default async function metricsRoute(app: FastifyInstance) {
  const handler = async () => fetchMetrics();
  app.get('/metrics', handler);
  app.get('/api/metrics', handler);
}
