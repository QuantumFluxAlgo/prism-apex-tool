/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/**
 * PRISM APEX V2 – Canonical Tickets Normaliser
 *
 * Purpose:
 * - Take whatever the tickets/worklist APIs return (rows, tickets, flat arrays, etc.)
 * - Produce a single, dashboard-friendly canonical ticket shape.
 * - Centralise ALL field name mapping and defaulting here.
 *
 * This is deliberately tolerant:
 * - Accepts { rows: [...] }, { tickets: [...] }, or a bare array.
 * - Handles multiple possible field names (opened_at_utc, created_at_utc, etc.).
 *
 * IMPORTANT:
 * - This file is infra only in this step: we are not yet wiring it into pages.
 * - That keeps the existing green tests untouched while we roll the adapter out.
 */

export type CanonicalTicketLike = {
  id: string;

  symbol: string | null;
  side: string | null;
  strategyId: string | null;
  status: string | null;

  createdAtUtc: string | null;
  completedAtUtc: string | null;
  sessionDateUtc: string | null;

  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;

  rrMultiple: number | null;
  pnl: number | null;
  pnlRMultiple: number | null;
  totalRisk: number | null;
  expectedReward: number | null;
  quantity: number | null;

  notes: string | null;

  contextRegime: string | null;
  contextAtrBucket: string | null;
  contextOrType: string | null;
};

/**
 * Normalise "side" into something consistent (LONG/SHORT/etc.).
 */
function normaliseSide(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;

  if (s === 'LONG' || s === 'BUY' || s === 'B') return 'LONG';
  if (s === 'SHORT' || s === 'SELL' || s === 'S') return 'SHORT';

  return s;
}

/**
 * Extract an ISO-ish UTC timestamp from a variety of common field names.
 */
function pickUtcTimestamp(row: any, keys: string[]): string | null {
  for (const key of keys) {
    const val = row?.[key];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return null;
}

/**
 * Extract a number from any of the candidate keys.
 */
function pickNumber(row: any, keys: string[]): number | null {
  for (const key of keys) {
    const val = row?.[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
      return Number(val);
    }
  }
  return null;
}

/**
 * Extract a string from any of the candidate keys.
 */
function pickString(row: any, keys: string[]): string | null {
  for (const key of keys) {
    const val = row?.[key];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return null;
}

/**
 * Normalise a single tickets/worklist row into CanonicalTicketLike.
 *
 * NOTE:
 * - This deliberately does NOT rely on the shared `CanonicalTicket` type.
 *   We keep this adapter self-contained and tolerant.
 */
export function normaliseTicketRow(row: any): CanonicalTicketLike {
  const id =
    pickString(row, ['id', 'ticket_id', 'ticketId']) ??
    // fall back to something deterministic-ish to avoid empty IDs
    String(row?.id ?? row?.ticket_id ?? '');

  return {
    id,

    symbol: pickString(row, ['symbol', 'sym', 'instrument']),
    side: normaliseSide(row?.side),

    strategyId: pickString(row, ['strategy', 'strategy_id', 'strategyId']),
    status: pickString(row, ['status', 'state']),

    createdAtUtc: pickUtcTimestamp(row, [
      'opened_at_utc',
      'created_at_utc',
      'createdAtUtc',
      'created_at',
    ]),
    completedAtUtc: pickUtcTimestamp(row, [
      'closed_at_utc',
      'completed_at_utc',
      'completedAtUtc',
      'closed_at',
    ]),
    sessionDateUtc: pickUtcTimestamp(row, [
      'session_date_utc',
      'sessionDateUtc',
      'session_date',
    ]),

    entryPrice: pickNumber(row, ['entry', 'entry_price', 'entryPrice']),
    stopPrice: pickNumber(row, ['stop', 'stop_price', 'stopPrice']),
    targetPrice: pickNumber(row, ['target', 'target_price', 'targetPrice']),

    rrMultiple: pickNumber(row, ['rr', 'r_multiple', 'rrMultiple']),
    pnl: pickNumber(row, ['pnl', 'pnl_usd', 'realized_pnl']),
    pnlRMultiple: pickNumber(row, ['pnl_r_multiple', 'pnlRMultiple']),
    totalRisk: pickNumber(row, ['total_risk', 'risk', 'risk_usd']),
    expectedReward: pickNumber(row, ['expected_reward', 'expectedReward']),
    quantity: pickNumber(row, ['quantity', 'qty', 'size']),

    notes: pickString(row, ['notes', 'comment', 'operator_notes']),

    contextRegime: pickString(row, ['context_regime', 'contextRegime']),
    contextAtrBucket: pickString(row, ['context_atr_bucket', 'contextAtrBucket']),
    contextOrType: pickString(row, ['context_or_type', 'contextOrType']),
  };
}

/**
 * Normalise any tickets-like API payload to a flat array of CanonicalTicketLike.
 *
 * Supported payload shapes:
 * - Array:            [ { ...row }, ... ]
 * - Row container:    { rows: [ { ...row }, ... ], ... }
 * - Tickets container:{ tickets: [ { ...row }, ... ], ... }
 */
export function normaliseTicketsPayload(payload: unknown): CanonicalTicketLike[] {
  let rows: any[] = [];

  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === 'object') {
    const obj = payload as any;

    if (Array.isArray(obj.rows)) {
      rows = obj.rows;
    } else if (Array.isArray(obj.tickets)) {
      rows = obj.tickets;
    }
  }

  if (!rows.length) return [];

  return rows.map((row) => normaliseTicketRow(row));
}

/**
 * Utility: map canonical tickets into a minimal shape for the Tickets page table.
 *
 * This is optional and can be used when we wire TicketsPage onto this adapter.
 */
export type TicketsTableRow = {
  id: string;
  symbol: string;
  strategy: string;
  side: string;
  createdAt: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  rr: number | null;
};

export function toTicketsTableRows(
  canonical: CanonicalTicketLike[],
): TicketsTableRow[] {
  return canonical.map((t) => ({
    id: t.id,
    symbol: t.symbol ?? '—',
    strategy: t.strategyId ?? '—',
    side: t.side ?? '—',
    createdAt: t.createdAtUtc ?? '—',
    entry: t.entryPrice,
    stop: t.stopPrice,
    target: t.targetPrice,
    rr: t.rrMultiple,
  }));
}

