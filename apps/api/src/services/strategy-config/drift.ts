import { Pool } from 'pg';
import type { StrategyKey } from '../../dto/strategy-config/types.js';
import { getFreezeInfo } from './freeze.js';
import { logGovernanceAlert } from '../governance/alert.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

const TABLE_MAP: Record<StrategyKey, string> = {
  orr: 'orr_config',
  osb: 'osb_config',
  vwap_ft: 'vwap_ft_config',
};

export interface DriftReport {
  strategy: StrategyKey;
  promotedVersion: number | null;
  latestVersion: number;
  freezeUpTo: number | null;
  paramDiff: Record<string, { old: unknown; new: unknown }>;
  isDrift: boolean;
  reasons: string[];
}

function shallowDiff(a: Record<string, unknown>, b: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    const oldVal = a ? (a as any)[key] : undefined;
    const newVal = b ? (b as any)[key] : undefined;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}

async function fetchParams(table: string, version: number | null) {
  if (version === null) return { version: null, params: {} };
  const { rows, rowCount } = await pool.query(
    `SELECT params FROM ${table} WHERE version = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [version],
  );
  if (!rowCount) {
    throw new Error(`Version ${version} not found in ${table}`);
  }
  return { version, params: rows[0].params || {} };
}

export async function getStrategyDrift(strategy: StrategyKey): Promise<DriftReport> {
  const table = TABLE_MAP[strategy];
  if (!table) {
    throw new Error(`Unsupported strategy ${strategy}`);
  }

  const latestRes = await pool.query(
    `SELECT version, params FROM ${table} ORDER BY version DESC, created_at DESC, id DESC LIMIT 1`,
  );
  if (latestRes.rowCount === 0) {
    throw new Error(`No configs found for strategy ${strategy}`);
  }
  const latestVersion = latestRes.rows[0].version as number;
  const latestParams = latestRes.rows[0].params || {};

  const promotedRes = await pool.query(
    `SELECT promoted_version FROM strategy_config_promotion WHERE strategy = $1`,
    [strategy],
  );
  const promotedVersion = promotedRes.rowCount ? (promotedRes.rows[0].promoted_version as number) : null;
  const { params: promotedParams } = await fetchParams(table, promotedVersion);

  const freezeInfo = await getFreezeInfo(strategy);
  const freezeUpTo = freezeInfo.frozenUpToVersion;

  const reasons: string[] = [];
  const paramDiff = shallowDiff(promotedParams as Record<string, unknown>, latestParams);

  if (promotedVersion === null) {
    reasons.push('no promoted version configured');
  } else if (latestVersion > promotedVersion) {
    reasons.push(`latestVersion ${latestVersion} > promotedVersion ${promotedVersion}`);
  }

  if (Object.keys(paramDiff).length > 0) {
    reasons.push('parameter mismatch between latest and promoted');
  }

  if (freezeUpTo !== null && latestVersion > freezeUpTo) {
    reasons.push(`latestVersion ${latestVersion} exceeds freeze pointer ${freezeUpTo}`);
  }

  const report: DriftReport = {
    strategy,
    promotedVersion,
    latestVersion,
    freezeUpTo,
    paramDiff,
    isDrift: reasons.length > 0,
    reasons,
  };

  if (report.isDrift) {
    logGovernanceAlert('drift_detected', {
      strategy,
      promotedVersion,
      latestVersion,
      freezeUpTo,
      reasons: [...reasons],
    });
  }

  return report;
}
