/**
 * P1 System Records – Planner Reject Counts (engineering-only)
 *
 * This store provides a typed persistence API for aggregated reject counters.
 * It intentionally does NOT expose a public HTTP surface yet.
 *
 * Table: planner_reject_counts (deploy/sql/033_planner_reject_counts.sql)
 */

import { Pool, PoolClient } from 'pg';
import { makeSystemRecordStamps } from '../lib/systemRecordStamps.js';
import {
  PlannerKey,
  RejectStage,
  PlannerRejectReasonCode,
} from '../system-records/plannerRejectVocab.js';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
}

export function getPlannerRejectCountsPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

export async function withPlannerRejectCountsClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPlannerRejectCountsPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export type IncrementPlannerRejectCountInput = {
  sessionDate: string; // YYYY-MM-DD
  symbol: string;

  requestedPlanner: PlannerKey;
  rejectingPlanner: PlannerKey;

  rejectStage: RejectStage;
  reasonCode: PlannerRejectReasonCode;

  delta?: number; // default 1
};

export type PlannerRejectCountRow = {
  session_date: string;
  symbol: string;

  requested_planner: string;
  rejecting_planner: string;

  reject_stage: string;
  reason_code: string;

  count: string;

  engine_version: string;
  config_fingerprint: string;
  schema_version: number;
  computed_at_utc: string;
};

function clampDelta(delta: unknown): number {
  const n = typeof delta === 'number' && Number.isFinite(delta) ? Math.floor(delta) : 1;
  return Math.max(1, n);
}

const UPSERT_SQL = `
INSERT INTO planner_reject_counts (
  session_date,
  symbol,
  requested_planner,
  rejecting_planner,
  reject_stage,
  reason_code,
  count,
  engine_version,
  config_fingerprint,
  schema_version,
  computed_at_utc
)
VALUES (
  $1::date,
  $2::text,
  $3::text,
  $4::text,
  $5::text,
  $6::text,
  $7::bigint,
  $8::text,
  $9::text,
  $10::integer,
  $11::timestamptz
)
ON CONFLICT (
  session_date,
  symbol,
  requested_planner,
  rejecting_planner,
  reject_stage,
  reason_code
)
DO UPDATE SET
  count = planner_reject_counts.count + EXCLUDED.count,
  engine_version = EXCLUDED.engine_version,
  config_fingerprint = EXCLUDED.config_fingerprint,
  schema_version = EXCLUDED.schema_version,
  computed_at_utc = EXCLUDED.computed_at_utc
RETURNING
  session_date,
  symbol,
  requested_planner,
  rejecting_planner,
  reject_stage,
  reason_code,
  count,
  engine_version,
  config_fingerprint,
  schema_version,
  computed_at_utc
`;

const SELECT_BASE_SQL = `
SELECT
  session_date,
  symbol,
  requested_planner,
  rejecting_planner,
  reject_stage,
  reason_code,
  count,
  engine_version,
  config_fingerprint,
  schema_version,
  computed_at_utc
FROM planner_reject_counts
`;

export async function incrementPlannerRejectCount(
  input: IncrementPlannerRejectCountInput,
): Promise<PlannerRejectCountRow> {
  const delta = clampDelta(input.delta);
  const stamps = makeSystemRecordStamps({
    table: 'planner_reject_counts',
    requested_planner: input.requestedPlanner,
    rejecting_planner: input.rejectingPlanner,
    reject_stage: input.rejectStage,
    reason_code: input.reasonCode,
  });

  return withPlannerRejectCountsClient(async (client) => {
    const result = await client.query<PlannerRejectCountRow>(UPSERT_SQL, [
      input.sessionDate,
      input.symbol,
      input.requestedPlanner,
      input.rejectingPlanner,
      input.rejectStage,
      input.reasonCode,
      delta,
      stamps.engine_version,
      stamps.config_fingerprint,
      stamps.schema_version,
      stamps.computed_at_utc,
    ]);
    return result.rows[0];
  });
}

function clampLimit(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1000, Math.max(1, Math.floor(value)));
  }
  return fallback;
}

function clampOffset(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return 0;
}

export type ListPlannerRejectCountsInput = {
  sessionDate?: string;
  symbol?: string;
  requestedPlanner?: PlannerKey;
  rejectingPlanner?: PlannerKey;
  rejectStage?: RejectStage;
  reasonCode?: PlannerRejectReasonCode;
  limit?: number;
  offset?: number;
};

export async function listPlannerRejectCounts(
  input: ListPlannerRejectCountsInput = {},
): Promise<PlannerRejectCountRow[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.sessionDate) {
    where.push(`session_date = $${idx}::date`);
    values.push(input.sessionDate);
    idx += 1;
  }
  if (input.symbol) {
    where.push(`symbol = $${idx}::text`);
    values.push(input.symbol);
    idx += 1;
  }
  if (input.requestedPlanner) {
    where.push(`requested_planner = $${idx}::text`);
    values.push(input.requestedPlanner);
    idx += 1;
  }
  if (input.rejectingPlanner) {
    where.push(`rejecting_planner = $${idx}::text`);
    values.push(input.rejectingPlanner);
    idx += 1;
  }
  if (input.rejectStage) {
    where.push(`reject_stage = $${idx}::text`);
    values.push(input.rejectStage);
    idx += 1;
  }
  if (input.reasonCode) {
    where.push(`reason_code = $${idx}::text`);
    values.push(input.reasonCode);
    idx += 1;
  }

  const limit = clampLimit(input.limit, 100);
  const offset = clampOffset(input.offset);

  const sql = [
    SELECT_BASE_SQL,
    where.length ? `WHERE ${where.join(' AND ')}` : '',
    'ORDER BY session_date, symbol, requested_planner, rejecting_planner, reject_stage, reason_code',
    `LIMIT $${idx} OFFSET $${idx + 1}`,
  ]
    .filter(Boolean)
    .join('\n');

  values.push(limit, offset);

  return withPlannerRejectCountsClient(async (client) => {
    const result = await client.query<PlannerRejectCountRow>(sql, values);
    return result.rows;
  });
}
