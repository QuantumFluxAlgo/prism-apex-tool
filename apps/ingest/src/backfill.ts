import { Client } from 'pg';
import { setTimeout as sleep } from 'timers/promises';
import { z } from 'zod';

// Config via env
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
const SYMBOLS = (process.env.YAHOO_SYMBOLS ?? 'ES=F,NQ=F,GC=F,CL=F').split(',').map(s => s.trim()).filter(Boolean);
const RANGE = process.env.YAHOO_RANGE ?? '30d';
const INTERVAL = process.env.YAHOO_INTERVAL ?? '1m';

const MAX_CHUNK_MS = 6 * 24 * 60 * 60 * 1000; // stay under Yahoo's 1m window limit

function rangeToMs(range: string): number {
  const match = range.trim().match(/^(\d+)([smhdw])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function alignMs(ms: number, direction: 'floor' | 'ceil' = 'floor') {
  const minute = 60 * 1000;
  return direction === 'floor' ? Math.floor(ms / minute) * minute : Math.ceil(ms / minute) * minute;
}

function yahooUrl(symbol: string, start: number, end: number) {
  const p = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  p.searchParams.set('interval', INTERVAL);
  p.searchParams.set('includePrePost', 'true');
  p.searchParams.set('events', 'div,splits');
  const startSeconds = Math.floor(Math.max(0, alignMs(start) - 60 * 1000) / 1000);
  const endSeconds = Math.floor(alignMs(end, 'ceil') / 1000) + 60; // ensure exclusive upper bound
  p.searchParams.set('period1', startSeconds.toString());
  p.searchParams.set('period2', endSeconds.toString());
  return p.toString();
}

const ChartSchema = z.object({
  chart: z.object({
    result: z.array(z.object({
      timestamp: z.array(z.number()).optional(),
      indicators: z.object({
        quote: z.array(z.object({
          open: z.array(z.number().nullable()).optional(),
          high: z.array(z.number().nullable()).optional(),
          low: z.array(z.number().nullable()).optional(),
          close: z.array(z.number().nullable()).optional(),
          volume: z.array(z.number().nullable()).optional()
        }))
      })
    })).nullable()
  })
});

async function fetchWindow(symbol: string, startMs: number, endMs: number) {
  const url = yahooUrl(symbol, startMs, endMs);
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*'
        }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
      }
      const json = await res.json();
      const parsed = ChartSchema.parse(json);
      const [first] = parsed.chart.result ?? [];
      if (!first || !first.timestamp) return [];
      const ts = first.timestamp;
      const q = first.indicators.quote[0];

      const arr: {
        ts: Date; open: number; high: number; low: number; close: number; volume: number | null;
      }[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i]; const h = q.high?.[i]; const l = q.low?.[i]; const c = q.close?.[i];
        if (o == null || h == null || l == null || c == null) continue; // skip null bars
        const v = q.volume?.[i] ?? null;
        arr.push({
          ts: new Date(ts[i] * 1000), // seconds -> ms
          open: o, high: h, low: l, close: c, volume: v
        });
      }
      return arr;
    } catch (e) {
      lastErr = e;
      await sleep(300 * attempt);
    }
  }
  throw lastErr;
}

async function fetchBars(symbol: string) {
  const now = Date.now();
  const totalMs = Math.min(rangeToMs(RANGE), 29 * 24 * 60 * 60 * 1000);
  const startMs = now - totalMs;
  const rowsMap = new Map<string, { ts: Date; open: number; high: number; low: number; close: number; volume: number | null }>();
  console.log(`[ingest]    range ${totalMs / (24 * 60 * 60 * 1000)} days, start ${new Date(startMs).toISOString()}`);

  for (let windowStart = startMs; windowStart < now; windowStart += MAX_CHUNK_MS) {
    const windowEnd = Math.min(now, windowStart + MAX_CHUNK_MS);
    console.log(`[ingest]  -> window ${new Date(windowStart).toISOString()} to ${new Date(windowEnd).toISOString()}`);
    const chunk = await fetchWindow(symbol, windowStart, windowEnd);
    for (const row of chunk) {
      rowsMap.set(row.ts.toISOString(), row);
    }
    await sleep(200);
  }

  return Array.from(rowsMap.values()).sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

async function upsertBars(pg: Client, symbol: string, rows: Awaited<ReturnType<typeof fetchBars>>) {
  if (!rows.length) return 0;
  // Batch insert with ON CONFLICT to avoid duplicates
  const text = `
    INSERT INTO bars_1m (symbol, ts_utc, open, high, low, close, volume)
    SELECT * FROM UNNEST (
      $1::text[],
      $2::timestamptz[],
      $3::float8[],
      $4::float8[],
      $5::float8[],
      $6::float8[],
      $7::float8[]
    )
    ON CONFLICT (symbol, ts_utc) DO NOTHING
  `;
  const sym = new Array(rows.length).fill(symbol);
  const ts = rows.map(r => r.ts.toISOString());
  const o = rows.map(r => r.open);
  const h = rows.map(r => r.high);
  const l = rows.map(r => r.low);
  const c = rows.map(r => r.close);
  const v = rows.map(r => r.volume ?? null);

  await pg.query(text, [sym, ts, o, h, l, c, v]);
  const cntRes = await pg.query(
    `SELECT COUNT(*)::int AS n FROM bars_1m WHERE symbol=$1 AND ts_utc = ANY($2::timestamptz[])`,
    [symbol, ts]
  );
  const written = cntRes.rows[0]?.n ?? 0;
  await pg.query(
    `INSERT INTO ingest_log(symbol, range, interval, bars_written) VALUES ($1,$2,$3,$4)`,
    [symbol, process.env.YAHOO_RANGE ?? '30d', process.env.YAHOO_INTERVAL ?? '1m', written]
  );
  return written;
}

async function main() {
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();

  // Ensure tables exist (idempotent)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS bars_1m (
      symbol text NOT NULL,
      ts_utc timestamptz NOT NULL,
      open double precision NOT NULL,
      high double precision NOT NULL,
      low double precision NOT NULL,
      close double precision NOT NULL,
      volume double precision,
      PRIMARY KEY (symbol, ts_utc)
    );
    CREATE TABLE IF NOT EXISTS ingest_log (
      id bigserial PRIMARY KEY,
      symbol text NOT NULL,
      range text NOT NULL,
      interval text NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now(),
      bars_written integer NOT NULL DEFAULT 0
    );
  `);

  let total = 0;
  for (const s of SYMBOLS) {
    console.log(`[ingest] fetching ${s} ${RANGE}/${INTERVAL} ...`);
    const rows = await fetchBars(s);
    const written = await upsertBars(pg, s, rows);
    total += written;
    console.log(`[ingest] ${s} upserted ${written} bars (of ${rows.length})`);
    await sleep(200); // be gentle
  }
  await pg.end();
  console.log(`[ingest] done. total bars present now per symbol:`);
}

main().catch(err => {
  console.error('[ingest] ERROR', err);
  process.exit(1);
});
