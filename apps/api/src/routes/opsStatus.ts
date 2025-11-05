import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Heartbeat = { ts: string; ageSec: number } | null;

const HEARTBEAT_DIRS = [
  path.join(process.cwd(), 'apps/api/data/ops'),
  '/data/ops',
];

function readHeartbeat(name: string): Heartbeat {
  for (const dir of HEARTBEAT_DIRS) {
    try {
      const p = path.join(dir, `${name}.heartbeat`);
      if (!fs.existsSync(p)) continue;
      const txt = fs.readFileSync(p, 'utf8').trim();
      const ts = new Date(txt).toISOString();
      const ageSec = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
      return { ts, ageSec };
    } catch {
      continue;
    }
  }
  return null;
}

const seconds = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)) : null);

export default async function opsStatusRoute(app: FastifyInstance) {
  app.addHook('onClose', async () => {
    await pool.end().catch(() => undefined);
  });

  const handler = async () => {
    const now = new Date().toISOString();
    const client = await pool.connect();

    try {
      const keys = ['ES=F', 'NQ=F', 'CL=F', 'EURUSD=X'];
      const perKey: Record<string, string | null> = {};

      for (const symbol of keys) {
        const r = await client.query('select max(ts_utc) as m from public.bars_1m where symbol=$1', [symbol]);
        perKey[symbol] = r.rows[0]?.m ? new Date(r.rows[0].m).toISOString() : null;
      }

      const barsMax = await client.query('select max(ts_utc) as m from public.bars_1m');
      const ticketsMax = await client.query('select max(created_at_utc) as m from public.tickets');
      const openedToday = await client.query(
        "select count(*)::int c from public.tickets where opened_at_utc::date = (now() at time zone 'utc')::date",
      );
      const createdToday = await client.query(
        "select count(*)::int c from public.tickets where created_at_utc::date = (now() at time zone 'utc')::date",
      );

      const barsTs = barsMax.rows[0]?.m ? new Date(barsMax.rows[0].m).toISOString() : null;
      const ticketsTs = ticketsMax.rows[0]?.m ? new Date(ticketsMax.rows[0].m).toISOString() : null;

      const status = {
        now,
        bars: { maxTs: barsTs, perKey, ageSec: seconds(barsTs) },
        tickets: {
          maxCreatedTs: ticketsTs,
          openedToday: openedToday.rows[0]?.c ?? 0,
          createdToday: createdToday.rows[0]?.c ?? 0,
          ageSec: seconds(ticketsTs),
        },
        heartbeats: {
          gapfill: readHeartbeat('gapfill-realtime'),
          tickets: readHeartbeat('tickets-realtime'),
        },
      };

      const ok = (value: number | null, threshold: number) => value !== null && value <= threshold;
      const level = ok(status.bars.ageSec, 180) && ok(status.tickets.ageSec, 300)
        ? 'green'
        : ok(status.bars.ageSec, 900) && ok(status.tickets.ageSec, 1800)
          ? 'amber'
          : 'red';

      return { status: level, ...status };
    } finally {
      client.release();
    }
  };

  app.get('/api/ops/status', handler);
  app.get('/ops/status', handler);
}
