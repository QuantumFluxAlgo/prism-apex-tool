import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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

type BarsQuery = {
  symbol?: string;
  limit?: string;
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

  app.get(
    '/metrics/bars',
    async (req: FastifyRequest<{ Querystring: BarsQuery }>, reply) => fetchBars(req, reply),
  );
  app.get(
    '/api/metrics/bars',
    async (req: FastifyRequest<{ Querystring: BarsQuery }>, reply) => fetchBars(req, reply),
  );
}

async function fetchBars(req: FastifyRequest<{ Querystring: BarsQuery }>, reply: FastifyReply) {
  const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
  const symbol = (req.query.symbol ?? 'ES=F').trim();
  const limitRaw = Number(req.query.limit ?? 360);
  const limit = Math.min(1440, Math.max(30, Number.isFinite(limitRaw) ? limitRaw : 360));

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(
      `
        SELECT ts_utc AS ts, open, high, low, close, volume
        FROM bars_1m
        WHERE symbol = $1
        ORDER BY ts_utc DESC
        LIMIT $2
      `,
      [symbol, limit],
    );
    const rows = result.rows
      .reverse()
      .map((row) => ({
        ts: new Date(row.ts).toISOString(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume === null ? null : Number(row.volume),
      }))
      .filter((row) => Number.isFinite(row.open));
    return reply.send({ symbol, points: rows });
  } catch (err) {
    return reply.status(500).send({ symbol, points: [], error: (err as Error).message });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
