import { Pool, type PoolClient } from 'pg';
import type { StrategyKey } from '../../dto/strategy-config/types.js';
import { getFreezeInfo } from './freeze.js';
import { logGovernanceAlert } from '../governance/alert.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

const STRATEGY_TABLES: Record<StrategyKey, string> = {
  orr: 'orr_config',
  osb: 'osb_config',
  vwap_ft: 'vwap_ft_config',
};

export interface StrategyRollbackResult {
  strategy: StrategyKey;
  latestVersion: number;
  targetVersion: number;
  newVersion: number;
}

async function fetchVersion(
  client: PoolClient,
  strategy: StrategyKey,
  version?: number,
) {
  const table = STRATEGY_TABLES[strategy];
  const params: unknown[] = [];
  let query = `SELECT version, params
               FROM ${table}`;
  if (typeof version === 'number') {
    query += ' WHERE version = $1 ORDER BY created_at DESC, id DESC LIMIT 1';
    params.push(version);
  } else {
    query += ' ORDER BY version DESC, created_at DESC, id DESC LIMIT 1';
  }
  const { rows, rowCount } = await client.query(query, params);
  if (!rowCount) {
    throw new Error(
      typeof version === 'number'
        ? `Version ${version} not found for strategy ${strategy}`
        : `No config rows found for strategy ${strategy}`,
    );
  }
  return rows[0] as { version: number; params: unknown };
}

export async function rollbackStrategyConfig(
  strategy: StrategyKey,
  targetVersion?: number,
  operatorOverride?: string,
): Promise<StrategyRollbackResult> {
  const table = STRATEGY_TABLES[strategy];
  if (!table) {
    throw new Error(`Unsupported strategy key: ${strategy}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const latestRow = await fetchVersion(client, strategy);
    const latestVersion = latestRow.version;

    let resolvedTargetVersion: number;
    if (typeof targetVersion === 'number') {
      if (!Number.isInteger(targetVersion) || targetVersion <= 0) {
        throw new Error(`Invalid targetVersion ${targetVersion}`);
      }
      if (targetVersion >= latestVersion) {
        throw new Error(
          `targetVersion ${targetVersion} must be less than latestVersion ${latestVersion}`,
        );
      }
      resolvedTargetVersion = targetVersion;
    } else {
      resolvedTargetVersion = latestVersion - 1;
      if (resolvedTargetVersion <= 0) {
        throw new Error(
          `No previous version available to rollback for strategy ${strategy}`,
        );
      }
    }

    const freezeInfo = await getFreezeInfo(strategy);
    if (
      freezeInfo.frozenUpToVersion !== null &&
      resolvedTargetVersion <= freezeInfo.frozenUpToVersion
    ) {
      logGovernanceAlert('freeze_violation', {
        strategy,
        targetVersion: resolvedTargetVersion,
        frozenUpToVersion: freezeInfo.frozenUpToVersion,
      });
      throw new Error(
        `Rollback blocked: targetVersion ${resolvedTargetVersion} <= frozen_up_to_version ${freezeInfo.frozenUpToVersion} for ${strategy}`,
      );
    }

    const targetRow = await fetchVersion(client, strategy, resolvedTargetVersion);

    const newVersion = latestVersion + 1;
    const operator = operatorOverride?.trim() || 'rollback';

    await client.query(
      `INSERT INTO ${table} (version, operator, params)
       VALUES ($1, $2, $3)`,
      [newVersion, operator, targetRow.params],
    );

    await client.query(
      `INSERT INTO strategy_config_audit
         (strategy_key, version, previous_version, operator, params, diff)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        strategy,
        newVersion,
        latestVersion,
        operator,
        targetRow.params,
        {
          type: 'rollback',
          fromVersion: latestVersion,
          toVersion: resolvedTargetVersion,
        },
      ],
    );

    await client.query('COMMIT');

    return {
      strategy,
      latestVersion,
      targetVersion: resolvedTargetVersion,
      newVersion,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
