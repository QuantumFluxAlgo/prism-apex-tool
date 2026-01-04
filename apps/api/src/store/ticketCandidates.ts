/**
 * Ticket Candidates – Ticketizer reject ledger (Postgres)
 *
 * Purpose:
 * - Persist ONLY ticketizer rejects (not planner rejects, not worklist logic).
 * - Provide a queryable ledger for operator analytics and UI filters.
 *
 * Table: public.ticket_candidates (deploy/sql/036_ticket_candidates.sql)
 */

import { Pool, PoolClient } from 'pg';
import type { Ticket } from '../schemas/ticket.js';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
}

export function getTicketCandidatesPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

export async function withTicketCandidatesClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getTicketCandidatesPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export type TicketCandidateRow = {
  id: string;

  session_ts_utc: string;
  session_date: string | null;

  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';

  entry_price: string; // numeric
  stop_price: string | null; // numeric
  target_price: string | null; // numeric

  qty: number;

  rr_multiple: number | null;
  risk_dollars: number | null;

  rejection_reason: string | null;
  reject_reasons: string[] | null;

  meta: unknown;

  source: string;

  created_at_utc: string;
  updated_at_utc: string;
};

export type ListTicketCandidatesInput = {
  from?: string; // ISO datetime
  to?: string; // ISO datetime
  symbol?: string;
  strategy?: string;
  direction?: 'LONG' | 'SHORT';
  limit?: number; // default 50, max 500
  cursor?: number; // offset-based cursor
};

function clampLimit(limit: unknown): number {
  const n = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : 50;
  return Math.max(1, Math.min(500, n));
}

function clampCursor(cursor: unknown): number {
  const n = typeof cursor === 'number' && Number.isFinite(cursor) ? Math.floor(cursor) : 0;
  return Math.max(0, n);
}

export async function listTicketCandidates(
  input: ListTicketCandidatesInput,
): Promise<{ total: number; rows: TicketCandidateRow[]; nextCursor: number | null }> {
  const limit = clampLimit(input.limit);
  const offset = clampCursor(input.cursor);

  const where: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  function add(sql: string, value: unknown) {
    where.push(sql.replace('?', `$${idx}`));
    values.push(value);
    idx += 1;
  }

  if (input.from) add('session_ts_utc >= ?::timestamptz', input.from);
  if (input.to) add('session_ts_utc <= ?::timestamptz', input.to);
  if (input.symbol && input.symbol.trim()) add('symbol = ?::text', input.symbol.trim());
  if (input.strategy && input.strategy.trim()) add('strategy = ?::text', input.strategy.trim());
  if (input.direction) add('direction = ?::text', input.direction);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS n FROM public.ticket_candidates ${whereSql};`;

  const rowsSql = `
SELECT
  id,
  session_ts_utc,
  session_date,
  symbol,
  strategy,
  direction,
  entry_price,
  stop_price,
  target_price,
  qty,
  rr_multiple,
  risk_dollars,
  rejection_reason,
  reject_reasons,
  meta,
  source,
  created_at_utc,
  updated_at_utc
FROM public.ticket_candidates
${whereSql}
ORDER BY session_ts_utc DESC
LIMIT ${limit + 1} OFFSET ${offset};
`;

  return await withTicketCandidatesClient(async (client) => {
    const [{ rows: countRows }, { rows: dataRows }] = await Promise.all([
      client.query<{ n: number }>(countSql, values),
      client.query<TicketCandidateRow>(rowsSql, values),
    ]);

    const total = Number(countRows?.[0]?.n ?? 0);

    const sliced = dataRows.slice(0, limit);
    const nextCursor = dataRows.length > sliced.length ? offset + limit : null;

    return { total, rows: sliced, nextCursor };
  });
}

type UpsertTicketCandidateInput = {
  sessionTsUtc: string;

  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';

  entryPrice: number;
  stopPrice: number | null;
  targetPrice: number | null;

  qty: number;

  rrMultiple: number | null;
  riskDollars: number | null;

  rejectionReason: string | null;
  rejectReasons: string[] | null;

  meta: unknown;

  source: string; // "ticketizer"
};

const UPSERT_SQL = `
INSERT INTO public.ticket_candidates (
  session_ts_utc,
  symbol,
  strategy,
  direction,
  entry_price,
  stop_price,
  target_price,
  qty,
  rr_multiple,
  risk_dollars,
  rejection_reason,
  reject_reasons,
  meta,
  source,
  created_at_utc,
  updated_at_utc
)
VALUES (
  $1::timestamptz,
  $2::text,
  $3::text,
  $4::text,
  $5::numeric,
  $6::numeric,
  $7::numeric,
  $8::integer,
  $9::double precision,
  $10::double precision,
  $11::text,
  $12::text[],
  $13::jsonb,
  $14::text,
  $15::timestamptz,
  $16::timestamptz
)
ON CONFLICT (symbol, strategy, direction, session_ts_utc)
DO UPDATE SET
  entry_price = EXCLUDED.entry_price,
  stop_price = EXCLUDED.stop_price,
  target_price = EXCLUDED.target_price,
  qty = EXCLUDED.qty,
  rr_multiple = EXCLUDED.rr_multiple,
  risk_dollars = EXCLUDED.risk_dollars,
  rejection_reason = EXCLUDED.rejection_reason,
  reject_reasons = EXCLUDED.reject_reasons,
  meta = EXCLUDED.meta,
  source = EXCLUDED.source,
  updated_at_utc = EXCLUDED.updated_at_utc;
`;

export async function upsertTicketCandidateBestEffort(input: UpsertTicketCandidateInput): Promise<void> {
  const nowUtc = new Date().toISOString();
  await withTicketCandidatesClient(async (client) => {
    await client.query(UPSERT_SQL, [
      input.sessionTsUtc,
      input.symbol,
      input.strategy,
      input.direction,
      input.entryPrice,
      input.stopPrice,
      input.targetPrice,
      input.qty,
      input.rrMultiple,
      input.riskDollars,
      input.rejectionReason,
      input.rejectReasons,
      input.meta ?? null,
      input.source,
      nowUtc,
      nowUtc,
    ]);
  });
}

/**
 * Ticketizer helper:
 * - only call this when ticket.accepted === false (reject path)
 * - only ticketizer should call it (it is NOT a generic reject ledger)
 */
export async function upsertTicketCandidateFromTicketizer(ticket: Ticket): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTicket: any = ticket as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaAny: any = (anyTicket?.meta as any) ?? {};

  const strategy =
    (typeof metaAny.strategy === 'string' && metaAny.strategy.trim().length
      ? metaAny.strategy
      : typeof metaAny.strategyId === 'string' && metaAny.strategyId.trim().length
        ? metaAny.strategyId
        : typeof anyTicket.strategy === 'string' && anyTicket.strategy.trim().length
          ? anyTicket.strategy
          : 'UNKNOWN') as string;

  const sessionTsUtc =
    (typeof anyTicket.timestampUtc === 'string' && anyTicket.timestampUtc.length
      ? anyTicket.timestampUtc
      : new Date().toISOString()) as string;

  const direction = (anyTicket.side ?? anyTicket.direction) as 'LONG' | 'SHORT';

  const entryPrice = Number(anyTicket.entry ?? anyTicket.entryPrice ?? NaN);
  const stopPriceRaw = anyTicket.stop ?? anyTicket.stopPrice ?? null;
  const targetPriceRaw = anyTicket.target ?? anyTicket.targetPrice ?? null;

  if (!Number.isFinite(entryPrice) || (direction !== 'LONG' && direction !== 'SHORT')) return;

  const stopPrice = stopPriceRaw === null || stopPriceRaw === undefined ? null : Number(stopPriceRaw);
  const targetPrice =
    targetPriceRaw === null || targetPriceRaw === undefined ? null : Number(targetPriceRaw);

  const rrMultiple =
    typeof anyTicket.rrMultiple === 'number' && Number.isFinite(anyTicket.rrMultiple)
      ? anyTicket.rrMultiple
      : null;

  const riskDollars =
    typeof anyTicket.riskDollars === 'number' && Number.isFinite(anyTicket.riskDollars)
      ? anyTicket.riskDollars
      : null;

  const rejectionReason =
    typeof anyTicket.reason === 'string' && anyTicket.reason.length ? anyTicket.reason : null;

  const rejectReasons = Array.isArray(anyTicket.reasons)
    ? anyTicket.reasons.map((r: unknown) => String(r)).filter((r: string) => r.length)
    : null;

  try {
    await upsertTicketCandidateBestEffort({
      sessionTsUtc,
      symbol: String(anyTicket.symbol ?? ''),
      strategy: String(strategy),
      direction,
      entryPrice,
      stopPrice: Number.isFinite(stopPrice as number) ? (stopPrice as number) : null,
      targetPrice: Number.isFinite(targetPrice as number) ? (targetPrice as number) : null,
      qty: Number.isFinite(Number(anyTicket.qty)) ? Number(anyTicket.qty) : 0,
      rrMultiple,
      riskDollars,
      rejectionReason,
      rejectReasons,
      meta: metaAny ?? null,
      source: 'ticketizer',
    });
  } catch {
    // Best-effort: never block the ticketizer loop.
  }
}
