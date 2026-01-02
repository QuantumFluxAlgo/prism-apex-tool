import { pool } from '../db';

/**
 * Shadow Outcomes store (P1-4)
 *
 * Persists minimal "would it have hit stop/target?" outcomes per ticket from stored 1m bars.
 * Table: public.shadow_outcomes
 * PK: (ticket_id, horizon_minutes, variant)
 *
 * Notes:
 * - variant/outcome are Postgres enums (shadow_variant / shadow_outcome).
 * - This store is deliberately thin; compute logic lives in the job.
 */

export type ShadowVariant = 'RAW' | 'BE_1R';
export type ShadowOutcome = 'TARGET' | 'STOP' | 'NEITHER' | 'INSUFFICIENT_DATA';

export interface ShadowOutcomeRow {
  ticket_id: string;                 // uuid
  horizon_minutes: number;           // int
  variant: ShadowVariant;            // enum
  anchor_ts_utc: string;             // timestamptz ISO
  window_end_ts_utc: string;         // timestamptz ISO
  outcome: ShadowOutcome;            // enum
  outcome_ts_utc: string | null;     // timestamptz ISO
  stop_touched: boolean;
  target_touched: boolean;
  be_triggered: boolean;
  be_trigger_ts_utc: string | null;  // timestamptz ISO
  bars_expected: number;
  bars_scanned: number;
  computed_at_utc?: string;          // optional (defaults to now())
  meta: any;                         // jsonb
}

export async function upsertShadowOutcomes(rows: ShadowOutcomeRow[]): Promise<number> {
  if (!rows.length) return 0;

  const cols = [
    'ticket_id',
    'horizon_minutes',
    'variant',
    'anchor_ts_utc',
    'window_end_ts_utc',
    'outcome',
    'outcome_ts_utc',
    'stop_touched',
    'target_touched',
    'be_triggered',
    'be_trigger_ts_utc',
    'bars_expected',
    'bars_scanned',
    'meta',
  ];

  const values: any[] = [];
  const tuples: string[] = [];

  const pushRow = (r: ShadowOutcomeRow) => {
    const baseIdx = values.length;
    values.push(
      r.ticket_id,
      r.horizon_minutes,
      r.variant,
      r.anchor_ts_utc,
      r.window_end_ts_utc,
      r.outcome,
      r.outcome_ts_utc,
      r.stop_touched,
      r.target_touched,
      r.be_triggered,
      r.be_trigger_ts_utc,
      r.bars_expected,
      r.bars_scanned,
      JSON.stringify(r.meta ?? {}),
    );
    const ph = Array.from({ length: cols.length }, (_, i) => `$${baseIdx + i + 1}`);
    tuples.push(`(${ph.join(',')})`);
  };

  rows.forEach(pushRow);

  const sql = `
    INSERT INTO public.shadow_outcomes (${cols.join(',')})
    VALUES ${tuples.join(',')}
    ON CONFLICT (ticket_id, horizon_minutes, variant)
    DO UPDATE SET
      anchor_ts_utc       = EXCLUDED.anchor_ts_utc,
      window_end_ts_utc   = EXCLUDED.window_end_ts_utc,
      outcome             = EXCLUDED.outcome,
      outcome_ts_utc      = EXCLUDED.outcome_ts_utc,
      stop_touched        = EXCLUDED.stop_touched,
      target_touched      = EXCLUDED.target_touched,
      be_triggered        = EXCLUDED.be_triggered,
      be_trigger_ts_utc   = EXCLUDED.be_trigger_ts_utc,
      bars_expected       = EXCLUDED.bars_expected,
      bars_scanned        = EXCLUDED.bars_scanned,
      computed_at_utc     = now(),
      meta                = EXCLUDED.meta::jsonb
  `;

  const res = await pool.query(sql, values);
  return res.rowCount ?? rows.length;
}

export async function getShadowOutcomesByTicketId(ticketId: string): Promise<ShadowOutcomeRow[]> {
  const sql = `
    SELECT
      ticket_id,
      horizon_minutes,
      variant::text as variant,
      anchor_ts_utc,
      window_end_ts_utc,
      outcome::text as outcome,
      outcome_ts_utc,
      stop_touched,
      target_touched,
      be_triggered,
      be_trigger_ts_utc,
      bars_expected,
      bars_scanned,
      computed_at_utc,
      meta
    FROM public.shadow_outcomes
    WHERE ticket_id = $1
    ORDER BY horizon_minutes ASC, variant::text ASC
  `;
  const res = await pool.query(sql, [ticketId]);
  return res.rows;
}

/**
 * Optional aggregate helper for future:
 * sessionDate + strategy filtered read (joins tickets).
 * Keep bounded by LIMIT for safety.
 */
export async function getShadowOutcomesBySessionAndStrategy(
  sessionDateUtc: string,
  strategy: string,
  limit = 500
): Promise<ShadowOutcomeRow[]> {
  const sql = `
    SELECT
      so.ticket_id,
      so.horizon_minutes,
      so.variant::text as variant,
      so.anchor_ts_utc,
      so.window_end_ts_utc,
      so.outcome::text as outcome,
      so.outcome_ts_utc,
      so.stop_touched,
      so.target_touched,
      so.be_triggered,
      so.be_trigger_ts_utc,
      so.bars_expected,
      so.bars_scanned,
      so.computed_at_utc,
      so.meta
    FROM public.shadow_outcomes so
    JOIN public.tickets t ON t.id = so.ticket_id
    WHERE t.session_date_utc = $1::date
      AND t.strategy = $2
    ORDER BY so.computed_at_utc DESC
    LIMIT $3
  `;
  const res = await pool.query(sql, [sessionDateUtc, strategy, limit]);
  return res.rows;
}
