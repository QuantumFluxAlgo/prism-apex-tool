import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

type Metrics = {
  bars: Record<string, number>;
  tickets: { total: number | null; today: number | null };
  lastIngestUtc: string | null;
  dbConnected: boolean;
};

export default async function metricsRoute(app: FastifyInstance) {
  const handler = async () => {
    const res: Metrics = {
      bars: {},
      tickets: { total: null, today: null },
      lastIngestUtc: null,
      dbConnected: false,
    };

    const url = process.env.DATABASE_URL;
    if (!url) {
      return res;
    }

    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      res.dbConnected = true;

      // bars per symbol (if table exists)
      try {
        const q = await client.query(
          'SELECT symbol, COUNT(*)::int AS n FROM bars GROUP BY symbol ORDER BY symbol'
        );
        for (const row of q.rows) res.bars[row.symbol] = row.n;
      } catch {
        /* table may not exist yet */
      }

      // last bar timestamp (if exists)
      try {
        const q = await client.query('SELECT MAX(ts) AS last FROM bars');
        const last = q.rows?.[0]?.last;
        res.lastIngestUtc = last ? new Date(last).toISOString() : null;
      } catch {
        /* ignore */
      }

      // tickets counts (if table exists)
      try {
        const total = await client.query('SELECT COUNT(*)::int AS n FROM tickets');
        const today = await client.query(
          "SELECT COUNT(*)::int AS n FROM tickets WHERE created_at::date = CURRENT_DATE"
        );
        res.tickets.total = total.rows?.[0]?.n ?? null;
        res.tickets.today = today.rows?.[0]?.n ?? null;
      } catch {
        /* ignore */
      }
    } catch {
      // db down/missing — keep graceful defaults
    } finally {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
    return res;
  };

  app.get('/metrics', handler);
  app.get('/api/metrics', handler);
}
