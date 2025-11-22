import type { StrategyKey } from '../dto/strategy-engine/types.js';
import { runEngineSessionJob } from './engineRunJob.js';
import { logGovernanceAlert } from '../services/governance/alert.js';

export interface EngineReplayJobParams {
  strategies: StrategyKey[];
  symbols: string[];
  sessionDates: string[];
  maxRiskDollarsPerTrade?: number;
  meta?: Record<string, unknown>;
}

export interface EngineReplayJobSummary {
  totalSessions: number;
  attempted: number;
  succeeded: number;
  failed: number;
  totalSafetyEnvelopeDropped: number;
  totalHardStopRejected: number;
  lastEngineVersion: string | null;
  lastRiskEngineVersion: string | null;
  lastStrategyConfigVersion: number | null;
  failures: {
    strategy: string;
    symbol: string;
    sessionDate: string;
    error: string;
  }[];
}

export async function runEngineReplayJob(params: EngineReplayJobParams): Promise<EngineReplayJobSummary> {
  const { strategies, symbols, sessionDates, maxRiskDollarsPerTrade, meta } = params;
  const totalSessions = strategies.length * symbols.length * sessionDates.length;

  const summary: EngineReplayJobSummary = {
    totalSessions,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    totalSafetyEnvelopeDropped: 0,
    totalHardStopRejected: 0,
    lastEngineVersion: null,
    lastRiskEngineVersion: null,
    lastStrategyConfigVersion: null,
    failures: [],
  };

  if (!totalSessions) {
    console.log(
      JSON.stringify(
        {
          source: 'engineReplayJob',
          totalSessions,
          attempted: 0,
          succeeded: 0,
          failed: 0,
          failures: 0,
          note: 'No strategies/symbols/sessionDates provided; nothing to run',
        },
        null,
        2,
      ),
    );
    return summary;
  }

  for (const strategy of strategies) {
    for (const symbol of symbols) {
      for (const sessionDate of sessionDates) {
        summary.attempted += 1;
        const jobParams = {
          strategy,
          symbol,
          sessionDate,
          maxRiskDollarsPerTrade,
          meta: {
            source: 'engineReplayJob',
            ...(meta ?? {}),
          },
        };

        try {
          const result = await runEngineSessionJob(jobParams);
          summary.succeeded += 1;
          summary.totalSafetyEnvelopeDropped += result.safetyEnvelopeDropped;
          summary.totalHardStopRejected += result.hardStopRejected;
          summary.lastEngineVersion = result.engineVersion;
          summary.lastRiskEngineVersion = result.riskEngineVersion;
          summary.lastStrategyConfigVersion = result.strategyConfigVersion;
        } catch (err: any) {
          summary.failed += 1;
          summary.failures.push({
            strategy,
            symbol,
            sessionDate,
            error: typeof err?.message === 'string' ? err.message : String(err),
          });
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        source: 'engineReplayJob',
        totalSessions: summary.totalSessions,
        attempted: summary.attempted,
        succeeded: summary.succeeded,
        failed: summary.failed,
        failures: summary.failures.length,
        safetyDrops: summary.totalSafetyEnvelopeDropped,
        hardStopDrops: summary.totalHardStopRejected,
      },
      null,
      2,
    ),
  );

  if (summary.totalSafetyEnvelopeDropped > 0 || summary.totalHardStopRejected > 0) {
    logGovernanceAlert('replay_safety_summary', {
      totalSessions: summary.totalSessions,
      attempted: summary.attempted,
      succeeded: summary.succeeded,
      failed: summary.failed,
      totalSafetyEnvelopeDropped: summary.totalSafetyEnvelopeDropped,
      totalHardStopRejected: summary.totalHardStopRejected,
    });
  }

  return summary;
}
