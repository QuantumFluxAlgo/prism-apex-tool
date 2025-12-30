import { Pool, type PoolClient } from 'pg';
import type { StrategyKey } from '../../dto/strategy-config/types.js';
import { logGovernanceAlert } from '../governance/alert.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

const TABLE_MAP: Record<StrategyKey, string> = {
  orr: 'orr_config',
  osb: 'osb_config',
  vwap_ft: 'vwap_ft_config',
};

export interface StrategyPromotionInfo {
  strategy: StrategyKey;
  promotedVersion: number | null;
}

export async function getPromotedStrategyVersion(strategy: StrategyKey): Promise<StrategyPromotionInfo> {
  const client = await pool.connect();
  try {
    const { rows, rowCount } = await client.query(
      `SELECT promoted_version FROM strategy_config_promotion WHERE strategy = $1`,
      [strategy],
    );
    return {
      strategy,
      promotedVersion: rowCount ? (rows[0].promoted_version as number) : null,
    };
  } finally {
    client.release();
  }
}

async function fetchPromotableVersion(
  client: PoolClient,
  strategy: StrategyKey,
  version: number,
): Promise<{ params: unknown }> {
  const table = TABLE_MAP[strategy];
  if (!table) {
    throw new Error(`Unsupported strategy ${strategy}`);
  }
  const { rows, rowCount } = await client.query(
    `SELECT params
       FROM ${table}
       WHERE version = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    [version],
  );
  if (!rowCount) {
    throw new Error(`Version ${version} not found for strategy ${strategy}`);
  }
  return rows[0] as { params: unknown };
}

export interface PromoteStrategyResult {
  strategy: StrategyKey;
  promotedVersion: number;
  previousVersion: number | null;
}

export async function promoteStrategyConfig(
  strategy: StrategyKey,
  version: number,
  operator?: string | null,
): Promise<PromoteStrategyResult> {
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error(`Invalid promotion version: ${version}`);
  }
  const operatorValue = operator?.trim() || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const target = await fetchPromotableVersion(client, strategy, version);

    const { rows, rowCount } = await client.query(
      `SELECT promoted_version FROM strategy_config_promotion WHERE strategy = $1`,
      [strategy],
    );
    const previousVersion = rowCount ? (rows[0].promoted_version as number) : null;

    await client.query(
      `INSERT INTO strategy_config_promotion (strategy, promoted_version, operator)
       VALUES ($1, $2, $3)
       ON CONFLICT (strategy)
       DO UPDATE SET promoted_version = EXCLUDED.promoted_version,
                     operator = EXCLUDED.operator,
                     promoted_at = now()`,
      [strategy, version, operatorValue],
    );

    await client.query(
      `INSERT INTO strategy_config_audit
         (strategy_key, version, previous_version, operator, params, diff)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        strategy,
        version,
        previousVersion,
        operatorValue,
        target.params ?? {},
        {
          type: 'promotion',
          promotedVersion: version,
          previousVersion,
        },
      ],
    );

    await client.query('COMMIT');

    const result: PromoteStrategyResult = {
      strategy,
      promotedVersion: version,
      previousVersion,
    };

    logGovernanceAlert('config_promoted', {
      strategy,
      promotedVersion: version,
      previousVersion,
      operator: operatorValue,
    });

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
