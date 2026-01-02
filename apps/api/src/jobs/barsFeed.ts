import { Pool, type PoolClient } from 'pg';
import { publish } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';
import type { BarMessage } from './strategies.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const JOB_NAME = 'BARS_FEED';
const DEFAULT_SYMBOLS = ['ES=F', 'NQ=F', 'MES=F', 'MNQ=F'];

const trackedSymbols = resolveSymbols();
const enabled = resolveEnabled(trackedSymbols.length > 0);
const pollIntervalMs = clampPositiveInt(process.env.BARS_FEED_INTERVAL_MS, 5_000, 1_000);
const lookbackMinutes = clampPositiveInt(process.env.BARS_FEED_LOOKBACK_MINUTES, 720, 1);
const maxBatch = clampPositiveInt(process.env.BARS_FEED_MAX_BATCH, 500, 50);
const primeHistory = (process.env.BARS_FEED_PRIME_HISTORY ?? 'true').toLowerCase() !== 'false';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
const lastSeenTs = new Map<string, string>();

let timer: NodeJS.Timeout | null = null;
let running = false;
let pollInFlight = false;

function clampPositiveInt(raw: string | undefined, fallback: number, min = 1): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.floor(parsed);
}

function parseCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function resolveSymbols(): string[] {
  const sources = [
    process.env.BARS_FEED_SYMBOLS,
    process.env.STRATEGIES_JOB_SYMBOLS,
    process.env.TICKETIZER_JOB_SYMBOLS,
    process.env.INGEST_YAHOO_SYMBOLS,
    process.env.YAHOO_SYMBOLS,
  ];
  for (const source of sources) {
    const parsed = unique(parseCsv(source));
    if (parsed.length) return parsed;
  }
  return [...DEFAULT_SYMBOLS];
}

function resolveEnabled(hasSymbols: boolean): boolean {
  const raw = process.env.BARS_FEED_ENABLED;
  if (typeof raw === 'string' && raw.trim().length) {
    return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
  }
  return hasSymbols;
}

function normalizeRoot(symbol: string): string {
  const trimmed = symbol?.trim().toUpperCase() ?? '';
  if (!trimmed) return '';
  const idx = trimmed.indexOf('=');
  if (idx >= 0) return trimmed.slice(0, idx);
  return trimmed.replace(/[^A-Z0-9]/g, '');
}

const RTH_WINDOWS_UTC_MINUTES: Record<string, { start: number; end: number }> = {
  ES: { start: 14 * 60 + 30, end: 21 * 60 },
  MES: { start: 14 * 60 + 30, end: 21 * 60 },
  NQ: { start: 14 * 60 + 30, end: 21 * 60 },
  MNQ: { start: 14 * 60 + 30, end: 21 * 60 },
};

function inferSession(tsIso: string, root: string): 'RTH' | 'ETH' {
  const window = RTH_WINDOWS_UTC_MINUTES[root];
  if (!window) return 'RTH';
  const stamp = Date.parse(tsIso);
  if (Number.isNaN(stamp)) return 'RTH';
  const d = new Date(stamp);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return minutes >= window.start && minutes <= window.end ? 'RTH' : 'ETH';
}

function rowToBarMessage(row: {
  symbol: string;
  ts_utc: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}): BarMessage {
  const ts =
    row.ts_utc instanceof Date
      ? row.ts_utc.toISOString()
      : new Date(row.ts_utc).toISOString();
  const contract = row.symbol?.toUpperCase?.() ?? row.symbol;
  const symbol = normalizeRoot(contract);
  return {
    symbol,
    contract: contract || symbol,
    ts,
    open: Number(row.open ?? 0),
    high: Number(row.high ?? row.open ?? 0),
    low: Number(row.low ?? row.open ?? 0),
    close: Number(row.close ?? row.open ?? 0),
    volume: Number(row.volume ?? 0),
    session: inferSession(ts, symbol),
  };
}

async function drainSymbol(client: PoolClient, symbol: string): Promise<number> {
  const startFrom =
    lastSeenTs.get(symbol) ??
    new Date(Date.now() - lookbackMinutes * 60_000).toISOString();
  let since = startFrom;
  let published = 0;
  while (true) {
    const { rows } = await client.query(
      `
        SELECT symbol, ts_utc, open, high, low, close, volume
        FROM bars_1m
        WHERE symbol = $1
          AND ts_utc > $2::timestamptz
        ORDER BY ts_utc ASC
        LIMIT $3
      `,
      [symbol, since, maxBatch],
    );
    if (!rows.length) break;

    for (const row of rows) {
      const message = rowToBarMessage(row);
      publish<BarMessage>('bars.1m', message);
      since = message.ts;
      published += 1;
    }
    lastSeenTs.set(symbol, since);
    if (rows.length < maxBatch) break;
  }
  return published;
}

async function poll(): Promise<void> {
  if (!running || pollInFlight) return;
  pollInFlight = true;
  try {
    const client = await pool.connect();
    try {
      let total = 0;
      for (const symbol of trackedSymbols) {
        total += await drainSymbol(client, symbol);
      }
      jobManager.beat(JOB_NAME);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${JOB_NAME}] poll failed`, error);
  } finally {
    pollInFlight = false;
  }
}

export function registerBarsFeedJob(): void {
  jobManager.register(JOB_NAME, start, stop);
}

async function start(): Promise<void> {
  if (!enabled) {
    console.info(`[${JOB_NAME}] disabled via env (BARS_FEED_ENABLED=false)`);
    return;
  }
  if (!trackedSymbols.length) {
    console.warn(`[${JOB_NAME}] not started: no symbols provided`);
    return;
  }

  running = true;
  lastSeenTs.clear();
  const bootstrapIso = new Date(Date.now() - lookbackMinutes * 60_000).toISOString();
  if (primeHistory) {
    for (const symbol of trackedSymbols) {
      lastSeenTs.set(symbol, bootstrapIso);
    }
  } else {
    const client = await pool.connect();
    try {
      for (const symbol of trackedSymbols) {
        const { rows } = await client.query<{ ts: Date | string | null }>(
          `SELECT max(ts_utc) AS ts FROM bars_1m WHERE symbol = $1`,
          [symbol],
        );
        const ts = rows[0]?.ts;
        lastSeenTs.set(symbol, ts ? new Date(ts).toISOString() : bootstrapIso);
      }
    } finally {
      client.release();
    }
  }
  console.info(
    `[${JOB_NAME}] starting: symbols=${trackedSymbols.join(',')} interval=${pollIntervalMs}ms lookback=${lookbackMinutes}m maxBatch=${maxBatch}`,
  );
  await poll();
  timer = setInterval(() => {
    void poll();
  }, pollIntervalMs);
}

async function stop(): Promise<void> {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await pool.end().catch(() => {
    // intentional no-op: shutting down
  });
}
