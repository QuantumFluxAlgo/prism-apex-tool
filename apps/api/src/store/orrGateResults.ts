import { Pool } from 'pg';

export const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

export type OrrGateResultRow = {
  id: number;
  run_id: string;
  session_date: string; // YYYY-MM-DD
  symbol: string;

  engine_strategy_id: string;
  ticket_strategy_id: string;
  canonical_strategy_key: string;

  actionable: boolean;
  reason: string;

  metrics: Record<string, unknown>;
  details: Record<string, unknown>;

  engine_version: string;
  config_fingerprint: string;
  schema_version: number;
  computed_at_utc: string;
  created_at_utc: string;
};

export type InsertOrrGateResultInput = Omit<OrrGateResultRow, 'id' | 'created_at_utc'>;

export async function insertOrrGateResult(input: InsertOrrGateResultInput): Promise<void> {
  const sql = `
    INSERT INTO orr_gate_results (
      run_id,
      session_date,
      symbol,
      engine_strategy_id,
      ticket_strategy_id,
      canonical_strategy_key,
      actionable,
      reason,
      metrics,
      details,
      engine_version,
      config_fingerprint,
      schema_version,
      computed_at_utc
    )
    VALUES (
      $1::uuid,
      $2::date,
      $3::text,
      $4::text,
      $5::text,
      $6::text,
      $7::boolean,
      $8::text,
      $9::jsonb,
      $10::jsonb,
      $11::text,
      $12::text,
      $13::integer,
      $14::timestamptz
    )
    ON CONFLICT DO NOTHING;
  `;

  const values = [
    input.run_id,
    input.session_date,
    input.symbol,
    input.engine_strategy_id,
    input.ticket_strategy_id,
    input.canonical_strategy_key,
    input.actionable,
    input.reason,
    JSON.stringify(input.metrics ?? {}),
    JSON.stringify(input.details ?? {}),
    input.engine_version,
    input.config_fingerprint,
    input.schema_version,
    input.computed_at_utc,
  ];

  await pool.query(sql, values);
}

export interface ListOrrGateResultsQuery {
  symbol?: string;
  sessionDate?: string;
  sinceUtc?: string;
  untilUtc?: string;
  limit?: number;
  offset?: number;
}

export async function listOrrGateResults(
  query: ListOrrGateResultsQuery = {},
): Promise<OrrGateResultRow[]> {
  const limit = Math.max(1, Math.min(500, query.limit ?? 100));
  const offset = Math.max(0, query.offset ?? 0);

  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (query.symbol) {
    where.push(`symbol = $${i++}::text`);
    values.push(query.symbol);
  }

  if (query.sessionDate) {
    where.push(`session_date = $${i++}::date`);
    values.push(query.sessionDate);
  }

  if (query.sinceUtc) {
    where.push(`created_at_utc >= $${i++}::timestamptz`);
    values.push(query.sinceUtc);
  }

  if (query.untilUtc) {
    where.push(`created_at_utc <= $${i++}::timestamptz`);
    values.push(query.untilUtc);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
      run_id::text AS run_id,
      session_date::text AS session_date,
      symbol,
      engine_strategy_id,
      ticket_strategy_id,
      canonical_strategy_key,
      actionable,
      reason,
      metrics,
      details,
      engine_version,
      config_fingerprint,
      schema_version,
      computed_at_utc::text AS computed_at_utc,
      created_at_utc::text AS created_at_utc
    FROM orr_gate_results
    ${whereSql}
    ORDER BY created_at_utc DESC
    LIMIT ${limit}
    OFFSET ${offset};
  `;

  const res = await pool.query(sql, values);
  return res.rows as OrrGateResultRow[];
}

export interface LatestOrrGateResultsQuery {
  sessionDate: string;
  symbols: string[];
}

export async function listLatestOrrGateResults(
  query: LatestOrrGateResultsQuery,
): Promise<OrrGateResultRow[]> {
  const symbols = Array.from(new Set(query.symbols.map((s) => s.trim()).filter(Boolean)));
  if (!symbols.length) return [];

  const sql = `
    SELECT DISTINCT ON (session_date, symbol)
      id,
      run_id::text AS run_id,
      session_date::text AS session_date,
      symbol,
      engine_strategy_id,
      ticket_strategy_id,
      canonical_strategy_key,
      actionable,
      reason,
      metrics,
      details,
      engine_version,
      config_fingerprint,
      schema_version,
      computed_at_utc::text AS computed_at_utc,
      created_at_utc::text AS created_at_utc
    FROM orr_gate_results
    WHERE session_date = $1::date
      AND symbol = ANY($2::text[])
    ORDER BY session_date, symbol, created_at_utc DESC;
  `;

  const res = await pool.query(sql, [query.sessionDate, symbols]);
  return res.rows as OrrGateResultRow[];
}
