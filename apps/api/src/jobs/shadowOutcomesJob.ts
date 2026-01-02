import { pool } from '../db';
import {
  upsertShadowOutcomes,
  ShadowOutcome,
  ShadowOutcomeRow,
  ShadowVariant,
} from '../store/shadowOutcomes';

type Direction = 'LONG' | 'SHORT';

type TicketRow = {
  id: string;
  symbol: string;
  direction: Direction;
  created_at_utc: string;
  entry_price: number;
  stop_price: number;
  target_price: number;
};

type BarRow = {
  ts_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const DEFAULT_HORIZONS = [60, 240];
const VARIANTS: ShadowVariant[] = ['RAW', 'BE_1R'];

function envNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ['1', 'true', 'y', 'yes', 'on'].includes(raw.toLowerCase());
}

function computeR(direction: Direction, entry: number, stop: number): number | null {
  if (direction === 'LONG') {
    const r = entry - stop;
    return r > 0 ? r : null;
  }
  const r = stop - entry;
  return r > 0 ? r : null;
}

function stopTouched(direction: Direction, bar: BarRow, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function targetTouched(direction: Direction, bar: BarRow, target: number): boolean {
  return direction === 'LONG' ? bar.high >= target : bar.low <= target;
}

function beTriggered(direction: Direction, bar: BarRow, entry: number, r: number): boolean {
  return direction === 'LONG' ? bar.high >= entry + r : bar.low <= entry - r;
}

function buildOutcome(
  ticket: TicketRow,
  bars: BarRow[],
  horizonMinutes: number,
  variant: ShadowVariant,
): ShadowOutcomeRow {
  const anchor = ticket.created_at_utc;
  const windowEnd = new Date(new Date(anchor).getTime() + horizonMinutes * 60_000).toISOString();

  const entry = ticket.entry_price;
  const originalStop = ticket.stop_price;
  const target = ticket.target_price;

  let effectiveStop = originalStop;
  let stopHit = false;
  let targetHit = false;
  let beHit = false;
  let beTs: string | null = null;

  const r = variant === 'BE_1R' ? computeR(ticket.direction, entry, originalStop) : null;

  let outcome: ShadowOutcome = 'NEITHER';
  let outcomeTs: string | null = null;

  for (const bar of bars) {
    if (variant === 'BE_1R' && !beHit) {
      if (r == null) {
        return {
          ticket_id: ticket.id,
          horizon_minutes: horizonMinutes,
          variant,
          anchor_ts_utc: anchor,
          window_end_ts_utc: windowEnd,
          outcome: 'INSUFFICIENT_DATA',
          outcome_ts_utc: null,
          stop_touched: false,
          target_touched: false,
          be_triggered: false,
          be_trigger_ts_utc: null,
          bars_expected: horizonMinutes,
          bars_scanned: bars.length,
          meta: { error: 'INVALID_1R' },
        };
      }
      if (beTriggered(ticket.direction, bar, entry, r)) {
        beHit = true;
        beTs = bar.ts_utc;
        effectiveStop = entry;
      }
    }

    const hitStop = stopTouched(ticket.direction, bar, effectiveStop);
    const hitTarget = targetTouched(ticket.direction, bar, target);

    if (hitStop) stopHit = true;
    if (hitTarget) targetHit = true;

    if (!hitStop && !hitTarget) continue;

    if (hitStop && hitTarget) {
      outcome = 'STOP';
      outcomeTs = bar.ts_utc;
      break;
    }

    if (hitTarget) {
      outcome = 'TARGET';
      outcomeTs = bar.ts_utc;
      break;
    }

    // stop only
    if (variant === 'BE_1R' && beHit && effectiveStop === entry) {
      outcome = 'NEITHER';
      outcomeTs = bar.ts_utc;
      break;
    }

    outcome = 'STOP';
    outcomeTs = bar.ts_utc;
    break;
  }

  if (outcome === 'NEITHER' && bars.length < horizonMinutes) {
    outcome = 'INSUFFICIENT_DATA';
  }

  return {
    ticket_id: ticket.id,
    horizon_minutes: horizonMinutes,
    variant,
    anchor_ts_utc: anchor,
    window_end_ts_utc: windowEnd,
    outcome,
    outcome_ts_utc: outcomeTs,
    stop_touched: stopHit,
    target_touched: targetHit,
    be_triggered: beHit,
    be_trigger_ts_utc: beTs,
    bars_expected: horizonMinutes,
    bars_scanned: bars.length,
    meta: {
      anchor: 'created_at_utc',
      direction: ticket.direction,
      entry,
      stop: originalStop,
      target,
      be_exit: variant === 'BE_1R' && beHit && outcome === 'NEITHER' && outcomeTs !== null,
    },
  };
}

async function fetchTickets(limit: number, force: boolean): Promise<TicketRow[]> {
  const sql = `
    WITH so_counts AS (
      SELECT ticket_id, COUNT(*)::int AS c
      FROM public.shadow_outcomes
      GROUP BY ticket_id
    )
    SELECT
      t.id,
      t.symbol,
      UPPER(t.direction)::text AS direction,
      t.created_at_utc::timestamptz AS created_at_utc,
      t.entry_price::float8 AS entry_price,
      t.stop_price::float8 AS stop_price,
      t.target_price::float8 AS target_price
    FROM public.tickets t
    LEFT JOIN so_counts s ON s.ticket_id = t.id
    WHERE t.created_at_utc IS NOT NULL
      AND t.entry_price IS NOT NULL
      AND t.stop_price IS NOT NULL
      AND t.target_price IS NOT NULL
      AND (
        $2::boolean = TRUE
        OR s.c IS NULL
        OR s.c < $3
      )
    ORDER BY t.created_at_utc ASC
    LIMIT $1
  `;
  const res = await pool.query(sql, [limit, force, DEFAULT_HORIZONS.length * VARIANTS.length]);
  return res.rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    direction: (row.direction as string).toUpperCase() as Direction,
    created_at_utc: new Date(row.created_at_utc).toISOString(),
    entry_price: Number(row.entry_price),
    stop_price: Number(row.stop_price),
    target_price: Number(row.target_price),
  }));
}

async function fetchBars(symbol: string, anchor: string, horizonMinutes: number): Promise<BarRow[]> {
  const sql = `
    SELECT
      ts_utc::timestamptz AS ts_utc,
      open::float8 AS open,
      high::float8 AS high,
      low::float8 AS low,
      close::float8 AS close
    FROM public.bars_1m
    WHERE symbol = $1
      AND ts_utc >= date_trunc('minute', $2::timestamptz)
      AND ts_utc <  (date_trunc('minute', $2::timestamptz) + ($3::int * interval '1 minute'))
    ORDER BY ts_utc ASC
  `;
  const res = await pool.query(sql, [symbol, anchor, horizonMinutes]);
  return res.rows.map((row: any) => ({
    ts_utc: new Date(row.ts_utc).toISOString(),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
  }));
}

export async function runShadowOutcomesOnce(): Promise<{ tickets: number; rows: number }> {
  const limit = envNum('SHADOW_BATCH_LIMIT', 200);
  const force = envBool('SHADOW_FORCE_RECOMPUTE', false);

  const horizons = (process.env.SHADOW_HORIZONS_MINUTES || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const horizonList = horizons.length ? horizons : DEFAULT_HORIZONS;

  const tickets = await fetchTickets(limit, force);
  if (!tickets.length) return { tickets: 0, rows: 0 };

  const pending: ShadowOutcomeRow[] = [];

  for (const ticket of tickets) {
    for (const horizon of horizonList) {
      const bars = await fetchBars(ticket.symbol, ticket.created_at_utc, horizon);
      for (const variant of VARIANTS) {
        pending.push(buildOutcome(ticket, bars, horizon, variant));
      }
    }
  }

  const upserted = await upsertShadowOutcomes(pending);
  return { tickets: tickets.length, rows: upserted };
}
