import { Client } from 'pg';
import { setTimeout as sleep } from 'timers/promises';

const DATABASE_URL = process.env.DATABASE_URL!;
const SYMBOLS = (process.env.YAHOO_SYMBOLS ?? 'ES=F,NQ=F,GC=F,CL=F').split(',').map(s => s.trim()).filter(Boolean);
const INTERVAL = process.env.YAHOO_INTERVAL ?? '1m';

const MAX_CHUNK_MS = 6 * 24 * 60 * 60 * 1000;

function yahooUrl(symbol: string, start: number, end: number) {
  const p = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  p.searchParams.set('interval', INTERVAL);
  p.searchParams.set('includePrePost', 'true');
  p.searchParams.set('events', 'div,splits');
  const startSeconds = Math.floor(Math.max(0, Math.floor(start / 60000) * 60_000 - 60_000) / 1000);
  const endSeconds = Math.floor(Math.ceil(end / 60000) * 60_000 / 1000) + 60;
  p.searchParams.set('period1', String(startSeconds));
  p.searchParams.set('period2', String(endSeconds));
  return p.toString();
}

async function fetchWindow(symbol: string, startMs: number, endMs: number) {
  const url = yahooUrl(symbol, startMs, endMs);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*'
      }
    });
    if (res.ok) {
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      const ts: number[] = r?.timestamp ?? [];
      const q = r?.indicators?.quote?.[0] ?? {};
      const rows: { ts: Date; open: number; high: number; low: number; close: number; volume: number | null }[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
        if ([o, h, l, c].every(v => typeof v === 'number')) {
          rows.push({
            ts: new Date(ts[i] * 1000),
            open: o,
            high: h,
            low: l,
            close: c,
            volume: typeof q.volume?.[i] === 'number' ? q.volume[i] : null
          });
        }
      }
      return rows;
    }
    const text = await res.text().catch(() => '');
    if (attempt === 3) throw new Error(`Yahoo ${symbol} ${new Date(startMs).toISOString()}..${new Date(endMs).toISOString()} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
    await sleep(400);
  }
  return [];
}

async function upsertBars(pg: Client, symbol: string, rows: Awaited<ReturnType<typeof fetchWindow>>) {
  if (!rows.length) return 0;
  const text = `
    INSERT INTO bars_1m (symbol, ts_utc, open, high, low, close, volume)
    VALUES ${rows.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}::timestamptz, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(', ')}
    ON CONFLICT (symbol, ts_utc) DO UPDATE
      SET open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume
  `;
  const args: any[] = [];
  rows.forEach(r => {
    args.push(symbol, r.ts.toISOString(), r.open, r.high, r.low, r.close, r.volume);
  });
  const res = await pg.query(text, args);
  return res.rowCount ?? 0;
}

async function main() {
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();

  const sinceSql = `
    SELECT
      symbol,
      COALESCE(MIN(ts_utc), now() AT TIME ZONE 'utc' - interval '29 days') AS min_ts,
      COALESCE(MAX(ts_utc), now() AT TIME ZONE 'utc' - interval '29 days') AS max_ts
    FROM bars_1m
    WHERE ts_utc >= now() AT TIME ZONE 'utc' - interval '29 days'
      AND symbol = ANY($1::text[])
    GROUP BY symbol
  `;
  const { rows: bounds } = await pg.query(sinceSql, [SYMBOLS]);

  for (const sym of SYMBOLS) {
    const b = bounds.find(r => r.symbol === sym);
    const start = (b?.min_ts ?? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)) as Date;
    const gapsSql = `
      WITH series AS (
        SELECT generate_series(
          greatest(now() AT TIME ZONE 'utc' - interval '29 days', $1::timestamptz),
          now() AT TIME ZONE 'utc',
          interval '1 minute'
        ) AS ts
      ),
      have AS (
        SELECT ts_utc AS ts FROM bars_1m WHERE symbol = $2 AND ts_utc >= now() AT TIME ZONE 'utc' - interval '29 days'
      ),
      gaps AS (
        SELECT s.ts, lag(s.ts) OVER (ORDER BY s.ts) AS prev_ts
        FROM series s
        LEFT JOIN have h ON h.ts = s.ts
        WHERE h.ts IS NULL
      ),
      spans AS (
        SELECT ts AS start_ts,
               lead(ts) OVER (ORDER BY ts) AS next_ts,
               prev_ts
        FROM gaps
      ),
      merged AS (
        SELECT start_ts,
               COALESCE((SELECT MAX(ts) FROM gaps g2 WHERE g2.ts >= spans.start_ts AND g2.ts < COALESCE(spans.next_ts, now() AT TIME ZONE 'utc')), start_ts) AS end_ts
        FROM spans
        WHERE prev_ts IS NULL OR start_ts <> prev_ts + interval '1 minute'
      )
      SELECT start_ts, end_ts FROM merged ORDER BY start_ts;
    `;
    const { rows: gaps } = await pg.query(gapsSql, [start.toISOString(), sym]);

    console.log(`[gapfill] ${sym} -> ${gaps.length} gap spans`);
    for (const gap of gaps) {
      const gs = new Date(gap.start_ts);
      const ge = new Date(gap.end_ts);
      for (let winStart = gs.getTime(); winStart <= ge.getTime(); winStart += MAX_CHUNK_MS) {
        const winEnd = Math.min(ge.getTime() + 60_000, winStart + MAX_CHUNK_MS);
        const rows = await fetchWindow(sym, winStart, winEnd);
        const n = await upsertBars(pg, sym, rows);
        console.log(`[gapfill]   ${sym} ${new Date(winStart).toISOString()} → ${new Date(winEnd).toISOString()} upserted=${n}`);
        await sleep(200);
      }
    }
  }

  await pg.end();
  console.log('[gapfill] done.');
}

main().catch(err => {
  console.error('[gapfill] ERROR', err);
  process.exit(1);
});
