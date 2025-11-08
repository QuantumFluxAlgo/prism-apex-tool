import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';
import { classifyYahooStatus, yahooStatusToService } from '../lib/yahooHealth';

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

type SessionInfo = {
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

function buildSession(now: Date): SessionInfo {
  const [openH, openM] = parseSessionTime(process.env.SESSION_OPEN_UTC, '23:05');
  const [closeH, closeM] = parseSessionTime(process.env.SESSION_CLOSE_UTC, '21:55');

  const open = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    openH,
    openM,
    0,
    0,
  );
  let close = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    closeH,
    closeM,
    0,
    0,
  );
  if (close <= open) {
    close += DAY_MS;
  }

  const nowMs = now.getTime();
  let sessionOpen = open;
  let sessionClose = close;
  let isOpen = nowMs >= sessionOpen && nowMs < sessionClose;

  if (!isOpen && nowMs >= sessionClose) {
    sessionOpen += DAY_MS;
    sessionClose += DAY_MS;
  }

  const nextChangeTarget = isOpen ? sessionClose : sessionOpen;
  const nextChange = Math.max(0, nextChangeTarget - nowMs);

  return {
    is_open: isOpen,
    next_change_ms: nextChange,
    open_utc: new Date(sessionOpen).toISOString(),
    close_utc: new Date(sessionClose).toISOString(),
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
    const session = buildSession(now);
    const relaxed = !session.is_open;

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
    const yahooRows: { symbol: string; last_bar_utc: string; minutes_behind: number }[] = [];

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
          if (last) {
            yahooRows.push({
              symbol: row.symbol,
              last_bar_utc: last.toISOString(),
              minutes_behind: age / 60_000,
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
