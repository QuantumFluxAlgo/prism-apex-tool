import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';
import { classifyYahooStatus, yahooStatusToService } from '../lib/yahooHealth.js';

type Health = 'green' | 'amber' | 'red' | 'grey';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const DEFAULT_SYMBOLS = [
  'ES=F',
  'MES=F',
  'NQ=F',
  'MNQ=F',
  'YM=F',
  'RTY=F',
  'GC=F',
  'CL=F',
  '6E=F',
  'EURUSD=X',
  '^GDAXI',
] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type SymbolStatus = {
  symbol: string;
  last_utc: string | null;
  age_ms: number | null;
  health: Health;
};

export type SessionInfo = {
  is_open: boolean;
  next_change_ms: number;
  open_utc: string;
  close_utc: string;
};

type StatusResponse = {
  generated_at_utc: string;
  session: SessionInfo;
  services: {
    db: Health;
    api: Health;
    yahoo: Health;
    tickets_cron: Health;
    gapfill_cron: Health;
  };
  symbols: SymbolStatus[];
  yahoo_summary?: {
    status: string;
    ok_lag_min: number;
    degraded_lag_min: number;
  };
};

function parseSymbolList(): string[] {
  const seeded = new Set<string>(DEFAULT_SYMBOLS);
  const sources = [
    process.env.STATUS_SYMBOLS,
    process.env.YAHOO_SYMBOLS,
    process.env.YF_SYMBOLS,
  ];

  for (const src of sources) {
    if (!src) continue;
    src
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((symbol) => seeded.add(symbol));
  }

  const ordered: string[] = [...DEFAULT_SYMBOLS];
  const remainder = Array.from(seeded)
    .filter((symbol) => !ordered.includes(symbol))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remainder];
}

function parseSessionTime(value: string | undefined, fallback: string): [number, number] {
  const str = value && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback;
  const [h, m] = str.split(':').map((n) => Number.parseInt(n, 10));
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

type WindowConfig = { start: [number, number]; end: [number, number] };
const DEFAULT_WINDOWS: WindowConfig[] = [{ start: [14, 30], end: [21, 0] }];

function parseSessionWindows(): WindowConfig[] {
  const raw = (process.env.SESSION_WINDOWS_UTC ?? '').trim();
  if (raw.length) {
    const configs: WindowConfig[] = [];
    for (const token of raw.split(',').map((part) => part.trim())) {
      const match = token.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!match) continue;
      const start = parseSessionTime(match[1], match[1]);
      const end = parseSessionTime(match[2], match[2]);
      configs.push({ start, end });
    }
    if (configs.length) return configs;
  }
  const open = parseSessionTime(process.env.SESSION_OPEN_UTC, '14:30');
  const close = parseSessionTime(process.env.SESSION_CLOSE_UTC, '21:00');
  if (open[0] !== close[0] || open[1] !== close[1]) {
    return [{ start: open, end: close }];
  }
  return DEFAULT_WINDOWS;
}

type ConcreteWindow = { startMs: number; endMs: number };

function instantiateWindows(now: Date, configs: WindowConfig[]): ConcreteWindow[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  return configs.map(({ start, end }) => {
    const startMs = Date.UTC(year, month, date, start[0], start[1], 0, 0);
    let endMs = Date.UTC(year, month, date, end[0], end[1], 0, 0);
    if (endMs <= startMs) {
      endMs += DAY_MS;
    }
    return { startMs, endMs };
  });
}

function computeSession(now: Date): { session: SessionInfo; sessionDateUtc: string } {
  const configs = parseSessionWindows();
  const windows = instantiateWindows(now, configs);
  const nowMs = now.getTime();

  let active =
    windows.find((window) => nowMs >= window.startMs && nowMs < window.endMs) ?? null;

  let upcoming: ConcreteWindow;
  if (active) {
    upcoming = active;
  } else {
    const futureToday = windows.find((window) => nowMs < window.startMs);
    if (futureToday) {
      upcoming = futureToday;
    } else {
      const tomorrow = windows.map((window) => ({
        startMs: window.startMs + DAY_MS,
        endMs: window.endMs + DAY_MS,
      }));
      upcoming = tomorrow[0];
    }
  }

  const isOpen = Boolean(active);
  const openMs = active ? active.startMs : upcoming.startMs;
  const closeMs = active ? active.endMs : upcoming.endMs;
  const nextChangeTarget = active ? active.endMs : upcoming.startMs;
  const nextChange = Math.max(0, nextChangeTarget - nowMs);

  return {
    sessionDateUtc: new Date(openMs).toISOString().slice(0, 10),
    session: {
      is_open: isOpen,
      next_change_ms: nextChange,
      open_utc: new Date(openMs).toISOString(),
      close_utc: new Date(closeMs).toISOString(),
    },
  };
}

export function getSessionInfo(now: Date = new Date()): {
  sessionDateUtc: string;
  isOpen: boolean;
  session: SessionInfo;
} {
  const { session, sessionDateUtc } = computeSession(now);
  return {
    sessionDateUtc,
    isOpen: session.is_open,
    session,
  };
}

function healthFromAge(ageMs: number, relaxed: boolean): Health {
  if (relaxed) {
    if (ageMs <= 5 * 60_000) return 'green';
    if (ageMs <= 15 * 60_000) return 'amber';
    return 'grey';
  }
  if (ageMs <= 3 * 60_000) return 'green';
  if (ageMs <= 10 * 60_000) return 'amber';
  return 'red';
}

export default async function statusRoute(app: FastifyInstance) {
  const symbolsList = parseSymbolList();
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  async function handler(): Promise<StatusResponse> {
    const now = new Date();
    const sessionMeta = getSessionInfo(now);
    const session = sessionMeta.session;
    const relaxed = !sessionMeta.isOpen;

    const symbols: SymbolStatus[] = symbolsList.map((symbol) => ({
      symbol,
      last_utc: null,
      age_ms: null,
      health: relaxed ? 'grey' : 'red',
    }));
    const symbolIndex = new Map(symbols.map((entry, index) => [entry.symbol, index]));

    let dbHealth: Health = 'grey';
    let ticketsHealth: Health = relaxed ? 'grey' : 'red';
    let gapfillHealth: Health = 'grey';
    const yahooRows: {
      symbol: string;
      last_bar_timestamp: string;
      lag_seconds: number;
    }[] = [];

    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      dbHealth = 'green';
      try {
        const res = await client.query<{
          symbol: string;
          last_utc: Date | string | null;
        }>(
          `
            SELECT symbol, MAX(ts_utc) AS last_utc
            FROM bars_1m
            WHERE symbol = ANY($1::text[])
            GROUP BY symbol
          `,
          [symbolsList],
        );
        const nowMs = now.getTime();
        for (const row of res.rows) {
          const last = row.last_utc ? new Date(row.last_utc) : null;
          const age = last ? Math.max(0, nowMs - last.getTime()) : null;
          const idx = symbolIndex.get(row.symbol);
          let entry: SymbolStatus;
          if (idx !== undefined) {
            entry = symbols[idx];
          } else {
            entry = {
              symbol: row.symbol,
              last_utc: null,
              age_ms: null,
              health: relaxed ? 'grey' : 'red',
            };
            symbolIndex.set(row.symbol, symbols.length);
            symbols.push(entry);
          }
          entry.last_utc = last ? last.toISOString() : null;
          entry.age_ms = age;
          if (last && age !== null) {
            yahooRows.push({
              symbol: row.symbol,
              last_bar_timestamp: last.toISOString(),
              lag_seconds: age / 1000,
            });
          }
          entry.health = age === null ? (relaxed ? 'grey' : 'red') : healthFromAge(age, relaxed);
        }
      } catch {
        dbHealth = 'red';
      }

      try {
        const res = await client.query<{ last_open: Date | string | null }>(`
          SELECT MAX(opened_at_utc) AS last_open
          FROM tickets
          WHERE opened_at_utc >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours'
        `);
        const last = res.rows[0]?.last_open ? new Date(res.rows[0].last_open) : null;
        if (!last) {
          ticketsHealth = relaxed ? 'grey' : 'amber';
        } else {
          const age = Math.max(0, now.getTime() - last.getTime());
          ticketsHealth = healthFromAge(age, relaxed);
        }
      } catch {
        ticketsHealth = 'red';
      }

      try {
        const res = await client.query<{ last_fetch: Date | string | null }>(`
          SELECT MAX(fetched_at) AS last_fetch
          FROM ingest_log
        `);
        const last = res.rows[0]?.last_fetch ? new Date(res.rows[0].last_fetch) : null;
        if (!last) {
          gapfillHealth = 'amber';
        } else {
          const age = Math.max(0, now.getTime() - last.getTime());
          gapfillHealth = age <= 36 * 60 * 60 * 1000 ? 'green' : 'amber';
        }
      } catch {
        gapfillHealth = 'amber';
      }
    } catch {
      dbHealth = 'red';
    } finally {
      await client.end().catch(() => {});
    }

    const yahooSummary = classifyYahooStatus(yahooRows, now);
    const yahooHealth = yahooStatusToService(yahooSummary.status);

    return {
      generated_at_utc: now.toISOString(),
      session,
      services: {
        db: dbHealth,
        api: 'green',
        yahoo: yahooHealth,
        tickets_cron: ticketsHealth,
        gapfill_cron: gapfillHealth,
      },
      symbols,
      yahoo_summary: {
        status: yahooSummary.status,
        ok_lag_min: yahooSummary.ok_lag_min,
        degraded_lag_min: yahooSummary.degraded_lag_min,
      },
    };
  }

  app.get('/status', async (_req, reply) => reply.send(await handler()));
  app.get('/api/status', async (_req, reply) => reply.send(await handler()));
}
