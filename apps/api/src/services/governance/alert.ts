import type { EnginePreviewRequest } from '../../dto/strategy-engine/index.js';
import type { StrategyKey } from '../../dto/strategy-config/types.js';
import { logger } from '../../observability/logger.js';

export interface GovernanceAlertPayloads {
  drift_detected: {
    strategy: StrategyKey;
    promotedVersion: number | null;
    latestVersion: number;
    freezeUpTo: number | null;
    reasons: string[];
  };
  config_promoted: {
    strategy: StrategyKey;
    promotedVersion: number;
    previousVersion: number | null;
    operator?: string | null;
  };
  config_frozen: {
    strategy: StrategyKey;
    frozenUpToVersion: number;
    previousFrozenVersion: number | null;
    operator?: string | null;
  };
  freeze_violation: {
    strategy: StrategyKey;
    targetVersion: number;
    frozenUpToVersion: number;
  };
  safety_drops: {
    strategy: EnginePreviewRequest['strategy'] | string;
    symbol: string;
    sessionDate: string;
    dropCount: number;
  };
  hard_stop_drops: {
    strategy: EnginePreviewRequest['strategy'] | string;
    symbol: string;
    sessionDate: string;
    rejectedCount: number;
    engineVersion: string;
    riskEngineVersion: string;
    strategyConfigVersion: number | null;
  };
  engine_run_summary: {
    strategy: EnginePreviewRequest['strategy'] | string;
    symbol: string;
    sessionDate: string;
    safetyEnvelopeDropped: number;
    hardStopRejected: number;
    signals: number;
    tickets: number;
    engineVersion: string;
    riskEngineVersion: string;
    strategyConfigVersion: number | null;
  };
  replay_safety_summary: {
    totalSessions: number;
    attempted: number;
    succeeded: number;
    failed: number;
    totalSafetyEnvelopeDropped: number;
    totalHardStopRejected: number;
  };
  tickets_quality_summary: {
    route: 'tickets' | 'tickets-debug';
    filters: Record<string, unknown>;
    totals: {
      before: number;
      after: number;
      filteredOut: number;
    };
    scope: {
      symbol: string | null;
      direction: string | null;
      status: string | null;
    };
    timestamp: string;
  };
}

export type GovernanceAlertEvent = keyof GovernanceAlertPayloads;

export function logGovernanceAlert<E extends GovernanceAlertEvent>(
  event: E,
  payload: GovernanceAlertPayloads[E],
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'warn' as const,
    type: 'governance_alert' as const,
    event,
    ...payload,
  };

  try {
    logger.warn(entry);
  } catch {
    // Alerts must never interrupt business logic.
  }
}
