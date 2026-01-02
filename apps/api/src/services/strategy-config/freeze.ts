import { Pool, type PoolClient } from 'pg';
import type { StrategyKey } from '../../dto/strategy-config/types.js';
import { logGovernanceAlert } from '../governance/alert.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

const STRATEGY_TABLES: Record<StrategyKey, string> = {
  orr: 'orr_config',
  osb: 'osb_config',
  vwap_ft: 'vwap_ft_config',
};

export interface StrategyFreezeInfo {
  strategy: StrategyKey;
  frozenUpToVersion: number | null;
}

export interface StrategyFreezeResult extends StrategyFreezeInfo {
  previousFrozenVersion: number | null;
}

async function ensureVersionExists(client: PoolClient, strategy: StrategyKey, version: number): Promise<{ params: unknown }> {
  const table = STRATEGY_TABLES[strategy];
  const { rows, rowCount } = await client.query(
    `SELECT params FROM ${table}
       WHERE version = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    [version],
  );
  if (!rowCount) {
    throw new Error(`Version ${version} not found for strategy ${strategy}`);
  }
  return rows[0];
}

export async function getFreezeInfo(strategy: StrategyKey): Promise<StrategyFreezeInfo> {
  const client = await pool.connect();
  try {
    const { rows, rowCount } = await client.query(
      `SELECT frozen_up_to_version FROM strategy_config_freeze WHERE strategy = $1`,
      [strategy],
    );
    if (!rowCount) {
      return { strategy, frozenUpToVersion: null };
    }
    return { strategy, frozenUpToVersion: rows[0].frozen_up_to_version };
  } finally {
    client.release();
  }
}

export async function freezeStrategyConfig(
  strategy: StrategyKey,
  version: number,
  operator?: string | null,
): Promise<StrategyFreezeResult> {
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error(`Invalid freeze version: ${version}`);
  }
  const operatorValue = operator?.trim() || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetRow = await ensureVersionExists(client, strategy, version);

    const { rows, rowCount } = await client.query(
      `SELECT frozen_up_to_version FROM strategy_config_freeze WHERE strategy = $1`,
      [strategy],
    );
    const previousFrozenVersion = rowCount ? rows[0].frozen_up_to_version : null;

    if (previousFrozenVersion !== null && version <= previousFrozenVersion) {
      await client.query('COMMIT');
      return {
        strategy,
        frozenUpToVersion: previousFrozenVersion,
        previousFrozenVersion,
      };
    }

    const newFrozen = previousFrozenVersion === null ? version : Math.max(previousFrozenVersion, version);

    await client.query(
      `INSERT INTO strategy_config_freeze (strategy, frozen_up_to_version, operator)
       VALUES ($1, $2, $3)
       ON CONFLICT (strategy)
       DO UPDATE SET frozen_up_to_version = EXCLUDED.frozen_up_to_version,
                     operator = EXCLUDED.operator,
                     frozen_at = now()`,
      [strategy, newFrozen, operatorValue],
    );

    await client.query(
      `INSERT INTO strategy_config_audit
         (strategy_key, version, previous_version, operator, params, diff)
       VALUES
         ($1, $2, $3, $4, $5, $6)`,
      [
        strategy,
        newFrozen,
        previousFrozenVersion,
        operatorValue,
        targetRow.params,
        { type: 'freeze', frozenUpToVersion: newFrozen },
      ],
    );

    await client.query('COMMIT');

    logGovernanceAlert('config_frozen', {
      strategy,
      frozenUpToVersion: newFrozen,
      previousFrozenVersion,
      operator: operatorValue ?? null,
    });

    return {
      strategy,
      frozenUpToVersion: newFrozen,
      previousFrozenVersion,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
