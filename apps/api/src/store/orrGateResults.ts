import { Pool, type PoolClient } from 'pg';

export const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

export function getOrrGateResultsPool(): Pool {
  return pool;
}

export async function withOrrGateResultsClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

type PgQueryable = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
};

export interface OrrGateResultRow {
  run_id: string;
  session_date: string;
  symbol: string;

  engine_strategy_id: string;
  ticket_strategy_id: string;
  canonical_strategy_key: string;

  actionable: boolean;
  reason: string;

  metrics: unknown;
  details: unknown;

  engine_version: string;
  config_fingerprint: string;
  schema_version: number;
  computed_at_utc: string;
}

export interface InsertOrrGateResultInput {
  run_id: string;
  session_date: string;
  symbol: string;

  engine_strategy_id: string;
  ticket_strategy_id: string;
  canonical_strategy_key: string;

  actionable: boolean;
  reason: string;

  metrics: unknown;
  details: unknown;

  engine_version: string;
  config_fingerprint: string;
  schema_version: number;
  computed_at_utc: string;
}

export async function insertOrrGateResultWithClient(
  db: PgQueryable,
  input: InsertOrrGateResultInput,
): Promise<void> {
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

  await db.query(sql, values);
}

export async function insertOrrGateResult(input: InsertOrrGateResultInput): Promise<void> {
  await insertOrrGateResultWithClient(pool, input);
}

export interface ListOrrGateResultsQuery {
  sessionDate?: string;
  symbol?: string;
  limit?: number;
  offset?: number;
}

export interface ListOrrGateResultsResult {
  items: OrrGateResultRow[];
  nextOffset: number | null;
}

export async function listOrrGateResults(query: ListOrrGateResultsQuery): Promise<ListOrrGateResultsResult> {
  const limit = Math.max(1, Math.min(500, query.limit ?? 100));
  const offset = Math.max(0, query.offset ?? 0);

  const where: string[] = ["canonical_strategy_key = 'orr_gate'"];
  const values: unknown[] = [];

  if (query.sessionDate) {
    values.push(query.sessionDate);
    where.push(`session_date = $${values.length}::date`);
  }

  if (query.symbol) {
    values.push(query.symbol);
    where.push(`symbol = $${values.length}::text`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const sql = `
    SELECT
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
    FROM orr_gate_results
    ${whereSql}
    ORDER BY computed_at_utc DESC
    LIMIT ${limit}
    OFFSET ${offset};
  `;

  const res = await pool.query(sql, values as any);
  const items = (res.rows ?? []) as OrrGateResultRow[];
  const nextOffset = items.length === limit ? offset + limit : null;

  return { items, nextOffset };
}

export async function listLatestOrrGateResults(args: {
  sessionDate: string;
  symbols: string[];
}): Promise<OrrGateResultRow[]> {
  if (!args.symbols.length) return [];

  const sql = `
    SELECT DISTINCT ON (symbol)
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
    FROM orr_gate_results
    WHERE canonical_strategy_key = 'orr_gate'
      AND session_date = $1::date
      AND symbol = ANY($2::text[])
    ORDER BY symbol, computed_at_utc DESC;
  `;

  const res = await pool.query(sql, [args.sessionDate, args.symbols]);
  return (res.rows ?? []) as OrrGateResultRow[];
}
