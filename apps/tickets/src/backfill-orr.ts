import { Client } from 'pg';

type Bar = { ts: Date; open: number; high: number; low: number; close: number; volume: number | null };

type TicketDirection = 'LONG' | 'SHORT';

type EnvConfig = {
  databaseUrl: string;
  symbols: string[];
  days: number;
  openingRangeMinutes: number;
  reversalWindowMinutes: number;
  sessionOpenUtc: string;
  sessionCloseUtc: string;
};

const cfg: EnvConfig = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex',
  symbols: (process.env.YAHOO_SYMBOLS ?? 'ES=F,NQ=F,GC=F,CL=F').split(',').map((s) => s.trim()).filter(Boolean),
  days: Math.min(Math.max(Number(process.env.TICKETS_DAYS ?? '30'), 1), 30),
  openingRangeMinutes: Math.max(Number(process.env.ORR_OR_MIN ?? '5'), 1),
  reversalWindowMinutes: Math.max(Number(process.env.ORR_WINDOW_MIN ?? '60'), 1),
  sessionOpenUtc: process.env.SESSION_OPEN_UTC ?? '23:05',
  sessionCloseUtc: process.env.SESSION_CLOSE_UTC ?? '21:55'
};

function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error(`Invalid HH:MM value: ${hm}`);
  return { h, m };
}

function sessionBounds(ts: Date, openHm: string, closeHm: string) {
  const base = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), 0, 0, 0));
  const { h: oh, m: om } = parseHm(openHm);
  const { h: ch, m: cm } = parseHm(closeHm);
  const open = new Date(base);
  open.setUTCHours(oh, om, 0, 0);
  let close = new Date(base);
  close.setUTCHours(ch, cm, 0, 0);
  if (close <= open) close.setUTCDate(close.getUTCDate() + 1);
  if (ts < open) {
    open.setUTCDate(open.getUTCDate() - 1);
    close.setUTCDate(close.getUTCDate() - 1);
  }
  return { open, close };
}

function sessionKey(ts: Date, openHm: string, closeHm: string) {
  const { open } = sessionBounds(ts, openHm, closeHm);
  return open.toISOString().slice(0, 10);
}

function isWithinSession(ts: Date, openHm: string, closeHm: string) {
  const { open, close } = sessionBounds(ts, openHm, closeHm);
  return ts >= open && ts <= close;
}

async function ensureSchema(pg: Client) {
  await pg.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pg.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol TEXT NOT NULL,
      strategy TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('LONG','SHORT')),
      session_date_utc DATE NOT NULL,
      opened_at_utc TIMESTAMPTZ NOT NULL,
      closed_at_utc TIMESTAMPTZ NOT NULL,
      entry_price DOUBLE PRECISION NOT NULL,
      exit_price DOUBLE PRECISION NOT NULL,
      stop_price DOUBLE PRECISION,
      target_price DOUBLE PRECISION,
      pnl DOUBLE PRECISION,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pg.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_dedupe
      ON tickets(symbol, strategy, direction, opened_at_utc)
  `);
  await pg.query(`CREATE INDEX IF NOT EXISTS ix_tickets_session ON tickets(session_date_utc)`);
  await pg.query(`CREATE INDEX IF NOT EXISTS ix_tickets_symbol ON tickets(symbol)`);
}

async function fetchBars(pg: Client, symbol: string, sinceMs: number): Promise<Bar[]> {
 const res = await pg.query(`
   SELECT ts_utc AS ts, open, high, low, close, volume
   FROM bars_1m
    WHERE symbol = $1 AND ts_utc >= $2::timestamptz
    ORDER BY ts_utc ASC
  `, [symbol, new Date(sinceMs).toISOString()]);
  return res.rows.map((row) => ({
    ts: new Date(row.ts as string),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: row.volume === null ? null : Number(row.volume)
  }));
}

function groupBySession(bars: Bar[], openHm: string, closeHm: string) {
  const sessions = new Map<string, Bar[]>();
  for (const bar of bars) {
    if (!isWithinSession(bar.ts, openHm, closeHm)) continue;
    const session = sessionKey(bar.ts, openHm, closeHm);
    if (!sessions.has(session)) sessions.set(session, []);
    sessions.get(session)!.push(bar);
  }
  return sessions;
}

function simulateOrrTicket(sessionBars: Bar[]): {
  direction: TicketDirection;
  openedAt: Date;
  closedAt: Date;
  entry: number;
  exit: number;
  stop: number;
  target: number;
  orHigh: number;
  orLow: number;
} | null {
  const orBars = sessionBars.slice(0, cfg.openingRangeMinutes);
  if (orBars.length < cfg.openingRangeMinutes) return null;
  const orHigh = Math.max(...orBars.map((b) => b.high));
  const orLow = Math.min(...orBars.map((b) => b.low));
  const orHeight = orHigh - orLow;
  const windowEnd = new Date(sessionBars[0].ts.getTime() + cfg.reversalWindowMinutes * 60 * 1000);

  let entry: { dir: TicketDirection; bar: Bar } | null = null;

  for (const bar of sessionBars) {
    if (bar.ts > windowEnd) break;
    if (!entry && bar.high > orHigh) {
      const revert = sessionBars.find((b) => b.ts > bar.ts && b.close < orHigh && b.ts <= windowEnd);
      if (revert) entry = { dir: 'SHORT', bar: revert };
    }
    if (!entry && bar.low < orLow) {
      const revert = sessionBars.find((b) => b.ts > bar.ts && b.close > orLow && b.ts <= windowEnd);
      if (revert) entry = { dir: 'LONG', bar: revert };
    }
    if (entry) break;
  }

  if (!entry) return null;

  const entryBar = entry.bar;
  const openedAt = entryBar.ts;
  const direction = entry.dir;
  const entryPrice = entryBar.close;
  const stopPrice = direction === 'LONG' ? orLow : orHigh;
  const targetPrice = direction === 'LONG' ? entryPrice + orHeight : entryPrice - orHeight;

  let closedAt = sessionBars[sessionBars.length - 1].ts;
  let exitPrice = sessionBars[sessionBars.length - 1].close;

  for (const bar of sessionBars) {
    if (bar.ts <= openedAt) continue;
    if (direction === 'LONG') {
      if (bar.low <= stopPrice) { closedAt = bar.ts; exitPrice = stopPrice; break; }
      if (bar.high >= targetPrice) { closedAt = bar.ts; exitPrice = targetPrice; break; }
    } else {
      if (bar.high >= stopPrice) { closedAt = bar.ts; exitPrice = stopPrice; break; }
      if (bar.low <= targetPrice) { closedAt = bar.ts; exitPrice = targetPrice; break; }
    }
  }

  return {
    direction,
    openedAt,
    closedAt,
    entry: entryPrice,
    exit: exitPrice,
    stop: stopPrice,
    target: targetPrice,
    orHigh,
    orLow
  };
}

async function insertTicket(pg: Client, symbol: string, sessionDate: string, ticket: ReturnType<typeof simulateOrrTicket>) {
  if (!ticket) return;
  const pnl = ticket.direction === 'LONG' ? ticket.exit - ticket.entry : ticket.entry - ticket.exit;
  const rrRaw = ticket.entry === ticket.stop ? null : Math.abs((ticket.target - ticket.entry) / (ticket.entry - ticket.stop));
  const rr = Number.isFinite(rrRaw ?? NaN) ? rrRaw : null;
  const actionable = ticket.direction === 'LONG' && rr !== null && rr >= 2.0 && rr <= 4.5;
  let reason: string | null = null;
  if (!actionable) {
    if (ticket.direction !== 'LONG') reason = 'SHORT is view-only';
    else if (rr === null) reason = 'Missing R:R';
    else if (rr < 2.0) reason = 'R:R below 2.0';
    else if (rr > 4.5) reason = 'R:R above 4.5';
  }
  await pg.query(`
    INSERT INTO tickets (
      symbol, strategy, direction, session_date_utc,
      opened_at_utc, closed_at_utc, entry_price, exit_price,
     stop_price, target_price, pnl,
    rr,
    actionable,
    reason, rr, actionable, non_actionable_reason, meta
    ) VALUES (
      $1,'ORR',$2,$3::date,$4,$5,$6,$7,$8,$9,$10,
      jsonb_build_object(
        'orHigh',$11::double precision,
        'orLow',$12::double precision,
        'openingRangeMinutes',$13::int,
        'reversalWindowMinutes',$14::int
      )
    )
    ON CONFLICT (symbol, strategy, direction, opened_at_utc) DO UPDATE SET
      entry_price = EXCLUDED.entry_price,
      exit_price = EXCLUDED.exit_price,
      stop_price = EXCLUDED.stop_price,
      target_price = EXCLUDED.target_price,
      pnl = EXCLUDED.pnl,
      rr = EXCLUDED.rr,
      actionable = EXCLUDED.actionable,
      non_actionable_reason = EXCLUDED.non_actionable_reason,
      meta = EXCLUDED.meta
  `, [
    symbol,
    ticket.direction,
    sessionDate,
    ticket.openedAt.toISOString(),
    ticket.closedAt.toISOString(),
    ticket.entry,
    ticket.exit,
    ticket.stop,
    ticket.target,
    pnl,
    ticket.orHigh,
    ticket.orLow,
    cfg.openingRangeMinutes,
    cfg.reversalWindowMinutes
  ]);
}

async function run() {
  const pg = new Client({ connectionString: cfg.databaseUrl });
  await pg.connect();
  await ensureSchema(pg);

  const sinceMs = Date.now() - cfg.days * 24 * 60 * 60 * 1000;

  for (const symbol of cfg.symbols) {
    const bars = await fetchBars(pg, symbol, sinceMs);
    const sessionMap = groupBySession(bars, cfg.sessionOpenUtc, cfg.sessionCloseUtc);
    let inserted = 0;

    for (const [session, sessionBars] of sessionMap) {
      if (sessionBars.length < cfg.openingRangeMinutes + 1) continue;
      const ticket = simulateOrrTicket(sessionBars);
      if (!ticket) continue;
      await insertTicket(pg, symbol, session, ticket);
      inserted++;
    }

    console.log(`[tickets] ${symbol} ORR inserted=${inserted}`);
  }

  await pg.end();
  console.log('[tickets] backfill complete.');
}

run().catch((err) => {
  console.error('[tickets] ERROR', err);
  process.exit(1);
});
