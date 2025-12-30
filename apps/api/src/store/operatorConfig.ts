import { Pool } from 'pg';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

const SINGLE_ROW_ID = 1;

export type OperatorConfig = {
  dailyStartingBalance: number | null;
  maxDailyDrawdownPct: number | null;
  updatedAtUtc: string;
};

type OperatorConfigRow = {
  config: {
    dailyStartingBalance?: number | null;
    maxDailyDrawdownPct?: number | null;
  } | null;
  updated_at: Date | string | null;
};

const DEFAULT_OPERATOR_CONFIG: OperatorConfig = {
  dailyStartingBalance: null,
  maxDailyDrawdownPct: null,
  updatedAtUtc: new Date().toISOString(),
};

function normalizeRow(row?: OperatorConfigRow | null): OperatorConfig {
  if (!row) return { ...DEFAULT_OPERATOR_CONFIG, updatedAtUtc: new Date().toISOString() };
  const config = row.config ?? {};
  const updatedAt =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : typeof row.updated_at === 'string'
      ? new Date(row.updated_at).toISOString()
      : new Date().toISOString();
  return {
    dailyStartingBalance:
      typeof config.dailyStartingBalance === 'number' && Number.isFinite(config.dailyStartingBalance)
        ? config.dailyStartingBalance
        : null,
    maxDailyDrawdownPct:
      typeof config.maxDailyDrawdownPct === 'number' && Number.isFinite(config.maxDailyDrawdownPct)
        ? config.maxDailyDrawdownPct
        : null,
    updatedAtUtc: updatedAt,
  };
}

export async function getOperatorConfig(): Promise<OperatorConfig> {
  const client = await pool.connect();
  try {
    const res = await client.query<OperatorConfigRow>('SELECT config, updated_at FROM operator_config WHERE id = $1', [
      SINGLE_ROW_ID,
    ]);
    if (res.rowCount === 0) {
      return { ...DEFAULT_OPERATOR_CONFIG, updatedAtUtc: new Date().toISOString() };
    }
    return normalizeRow(res.rows[0]);
  } finally {
    client.release();
  }
}

type OperatorConfigPatch = Partial<Pick<OperatorConfig, 'dailyStartingBalance' | 'maxDailyDrawdownPct'>>;

function validatePatch(patch: OperatorConfigPatch): OperatorConfigPatch {
  const next: OperatorConfigPatch = {};
  if ('dailyStartingBalance' in patch) {
    const value = patch.dailyStartingBalance;
    if (value === null) {
      next.dailyStartingBalance = null;
    } else if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      next.dailyStartingBalance = value;
    } else {
      throw new Error('dailyStartingBalance must be a positive number or null');
    }
  }
  if ('maxDailyDrawdownPct' in patch) {
    const value = patch.maxDailyDrawdownPct;
    if (value === null) {
      next.maxDailyDrawdownPct = null;
    } else if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100) {
      next.maxDailyDrawdownPct = value;
    } else {
      throw new Error('maxDailyDrawdownPct must be between 0 and 100 (exclusive) or null');
    }
  }
  return next;
}

export async function upsertOperatorConfig(patch: OperatorConfigPatch): Promise<OperatorConfig> {
  const validated = validatePatch(patch);
  const current = await getOperatorConfig();
  const now = new Date().toISOString();
  const next: OperatorConfig = {
    dailyStartingBalance:
      validated.dailyStartingBalance !== undefined ? validated.dailyStartingBalance : current.dailyStartingBalance,
    maxDailyDrawdownPct:
      validated.maxDailyDrawdownPct !== undefined ? validated.maxDailyDrawdownPct : current.maxDailyDrawdownPct,
    updatedAtUtc: now,
  };
  const payload = {
    dailyStartingBalance: next.dailyStartingBalance,
    maxDailyDrawdownPct: next.maxDailyDrawdownPct,
  };
  const client = await pool.connect();
  try {
    await client.query(
      `
        INSERT INTO operator_config (id, config, updated_at)
        VALUES ($1, $2::jsonb, $3::timestamptz)
        ON CONFLICT (id)
        DO UPDATE SET config = EXCLUDED.config, updated_at = EXCLUDED.updated_at
      `,
      [SINGLE_ROW_ID, JSON.stringify(payload), now],
    );
  } finally {
    client.release();
  }
  return next;
}
