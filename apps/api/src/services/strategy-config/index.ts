import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import {
  STRATEGY_KEYS,
  type StrategyConfigDto,
  type StrategyConfigUpdateInput,
  type StrategyKey,
  type StrategyConfigMeta,
  type StrategyParamsMap,
} from '../../dto/strategy-config/types.js';
import type { StrategyConfigAuditEntryDto } from '../../dto/strategy-config/audit.js';
import { STRATEGY_CONFIG_SCHEMA_MAP } from '../../dto/strategy-config/schema.js';
import { validateOrrConfig } from './validators/orr.js';
import { validateOsbConfig } from './validators/osb.js';
import { validateVwapftConfig } from './validators/vwapft.js';
import type { ValidationResult } from './validators/types.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

const TABLE_MAP: Record<StrategyKey, string> = {
  orr: 'orr_config',
  osb: 'osb_config',
  vwap_ft: 'vwap_ft_config',
};

const VALIDATORS: { [K in StrategyKey]: (config: StrategyParamsMap[K]) => ValidationResult } = {
  orr: validateOrrConfig,
  osb: validateOsbConfig,
  vwap_ft: validateVwapftConfig,
};

export class StrategyValidationError extends Error {
  public readonly strategy: StrategyKey;
  public readonly errors: string[];
  public readonly warnings: string[];

  constructor(strategy: StrategyKey, errors: string[], warnings: string[] = []) {
    super(`Invalid ${strategy} strategy configuration`);
    this.name = 'StrategyValidationError';
    this.strategy = strategy;
    this.errors = errors;
    this.warnings = warnings;
  }
}

export interface StrategyConfigResponse {
  config: StrategyConfigDto;
  warnings: string[];
}

const DEFAULT_CONFIGS: StrategyParamsMap = {
  orr: {
    openingRangeMinutes: 30,
    maxRange: 10,
    minRR: 1.5,
    retestDistance: 2,
    stopSize: 1,
    enableRetestFilter: true,
    allowedSession: 'RTH',
  },
  osb: {
    openingRangeMinutes: 30,
    breakoutDistance: 2,
    volatilityFilter: 5,
    rrMultiple: 2,
    directionBias: 'BOTH',
  },
  vwap_ft: {
    deviationBands: [0.5, 1],
    minATR: 1,
    allowedDirections: 'BOTH',
    lookbackPeriod: 20,
    sessionWindow: 'RTH',
  },
};

function normalizeKey(value: string): StrategyKey {
  const lowered = value.toLowerCase();
  if ((STRATEGY_KEYS as readonly string[]).includes(lowered)) {
    return lowered as StrategyKey;
  }
  throw new Error(`Unknown strategy key: ${value}`);
}

type StrategyConfigRecord<K extends StrategyKey> = K extends StrategyKey
  ? StrategyConfigMeta & {
      strategy: K;
      params: StrategyParamsMap[K];
    }
  : never;

function mapRow<K extends StrategyKey>(strategy: K, row?: any): StrategyConfigRecord<K> {
  const params: StrategyParamsMap[K] = parseParams(strategy, row?.params);
  if (!row) {
    return {
      strategy,
      id: null,
      version: 1,
      operator: null,
      createdAtUtc: null,
      updatedAtUtc: null,
      params,
    } as StrategyConfigRecord<K>;
  }
  return {
    strategy,
    id: typeof row.id === 'number' ? row.id : Number(row.id) || null,
    version: typeof row.version === 'number' ? row.version : Number(row.version) || 1,
    operator: typeof row.operator === 'string' ? row.operator : row.operator ?? null,
    createdAtUtc: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAtUtc: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    params,
  } as StrategyConfigRecord<K>;
}

async function runQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

async function fetchLatestRow(strategy: StrategyKey): Promise<any | null> {
  const table = TABLE_MAP[strategy];
  const { rows } = await runQuery(
    `SELECT id, version, operator, params, created_at, updated_at
     FROM ${table}
     ORDER BY version DESC, created_at DESC, id DESC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

function parseParams<K extends StrategyKey>(strategy: K, raw: unknown): StrategyParamsMap[K] {
  const schema = STRATEGY_CONFIG_SCHEMA_MAP[strategy];
  const parsed = schema.safeParse(raw ?? {});
  if (parsed.success) {
    return parsed.data as StrategyParamsMap[K];
  }
  return DEFAULT_CONFIGS[strategy];
}

function runBusinessValidation<K extends StrategyKey>(strategy: K, params: StrategyParamsMap[K]): ValidationResult {
  const validator = VALIDATORS[strategy];
  return validator(params);
}

async function insertStrategyConfigAudit<K extends StrategyKey>(
  strategy: K,
  version: number,
  previousVersion: number | null,
  operator: string | null,
  params: StrategyParamsMap[K],
  diff: Record<string, unknown> | null,
): Promise<void> {
  await runQuery(
    `INSERT INTO strategy_config_audit (strategy_key, version, previous_version, operator, params, diff)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [strategy, version, previousVersion, operator ?? null, params, diff],
  );
}

export async function getStrategyConfig(strategy: StrategyKey): Promise<StrategyConfigDto> {
  const row = await fetchLatestRow(strategy);
  return mapRow(strategy, row ?? undefined);
}

export async function getStrategyConfigByVersion(
  strategy: StrategyKey,
  version: number,
): Promise<StrategyConfigDto> {
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error(`Invalid strategy config version: ${version}`);
  }
  const table = TABLE_MAP[strategy];
  const { rows } = await runQuery(
    `SELECT id, version, operator, params, created_at, updated_at
       FROM ${table}
       WHERE version = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    [version],
  );
  if (!rows.length) {
    throw new Error(`Version ${version} not found for strategy ${strategy}`);
  }
  return mapRow(strategy, rows[0]);
}

export async function getStrategyConfigWithWarnings(strategy: StrategyKey): Promise<StrategyConfigResponse> {
  const row = await fetchLatestRow(strategy);
  const config = mapRow(strategy, row ?? undefined);
  const validation = runBusinessValidation(strategy, config.params);
  const warnings = validation.ok ? [...validation.warnings] : [...validation.errors, ...validation.warnings];
  if (!row) {
    warnings.push('No stored configuration found; using defaults');
  }
  return { config, warnings };
}

export async function updateStrategyConfig(
  strategy: StrategyKey,
  input: StrategyConfigUpdateInput,
): Promise<StrategyConfigResponse> {
  const table = TABLE_MAP[strategy];
  const latestRow = await fetchLatestRow(strategy);
  const nextVersion = (latestRow?.version ?? 0) + 1;

  const operator = input.operator === undefined ? latestRow?.operator ?? null : normalizeOperator(input.operator);
  const params = STRATEGY_CONFIG_SCHEMA_MAP[strategy].parse(input.params);
  const validation = runBusinessValidation(strategy, params);
  if (!validation.ok) {
    throw new StrategyValidationError(strategy, validation.errors, validation.warnings);
  }
  const warnings = [...validation.warnings];

  const { rows } = await runQuery(
    `INSERT INTO ${table} (id, version, operator, param_a, param_b, params)
       VALUES ($1, $2, $3, NULL, NULL, $4)
       RETURNING id, version, operator, params, created_at, updated_at`,
    [nextVersion, nextVersion, operator, params],
  );

  const diff = latestRow ? { before: latestRow.params ?? null, after: params } : null;
  await insertStrategyConfigAudit(strategy, nextVersion, latestRow?.version ?? null, operator, params, diff);

  return { config: mapRow(strategy, rows[0]), warnings };
}

function normalizeOperator(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseStrategyKey(value: string): StrategyKey {
  return normalizeKey(value);
}

export async function getStrategyConfigHistory(strategy: StrategyKey): Promise<StrategyConfigAuditEntryDto[]> {
  const { rows } = await runQuery(
    `SELECT audit_id, strategy_key, version, previous_version, operator, created_at, params, diff
     FROM strategy_config_audit
     WHERE strategy_key = $1
     ORDER BY created_at DESC, version DESC`,
    [strategy],
  );

  return rows.map((row) => ({
    auditId: row.audit_id,
    strategy: row.strategy_key,
    version: row.version,
    previousVersion: row.previous_version ?? null,
    operator: row.operator ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    params: row.params,
    diff: row.diff ?? null,
  }));
}
