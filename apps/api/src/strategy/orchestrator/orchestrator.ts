/**
 * Strategy Orchestrator – Phase 2.6
 *
 * Pure orchestrator that injects ORR v3, VWAP FT, and OSB engines
 * and applies deterministic decision rules:
 *   - OR window → ORR has priority if it wants to trade.
 *   - Outside OR window → VWAP FT / OSB considered with conflict resolution.
 *   - Conflicts → default to NO_TRADE.
 */
import {
  createRiskEngineV2,
  type RiskDecision,
  type RiskEngineContext,
  type TicketDraft,
} from '../../risk/risk-engine-v2.js';
import { computePositionFromStake } from '../sizing/ticket-sizing.js';

export type StrategyId = 'ORR_V3' | 'VWAP_FT' | 'OSB';
export type BasicSignalKind = 'LONG' | 'SHORT' | 'NO_TRADE';

export interface OrchestratorContext {
  symbol: string;
  sessionDateUtc: string;
  inOpeningRange: boolean;
  extra?: Record<string, unknown>;
}

export interface BasicEngine {
  id: StrategyId;
  evaluate(context: OrchestratorContext): BasicSignalKind;
}

export interface OrchestratorEngines {
  orr: BasicEngine;
  vwapFt: BasicEngine;
  osb: BasicEngine;
}

export interface OrchestratedDecision {
  primary: {
    id: StrategyId;
    kind: BasicSignalKind;
    reason?: string;
  };
  byStrategy: Record<StrategyId, BasicSignalKind>;
}

export interface StrategyOrchestrator {
  run(context: OrchestratorContext): OrchestratedDecision;
}

export function createStrategyOrchestrator(engines: OrchestratorEngines): StrategyOrchestrator {
  return {
    run(context: OrchestratorContext): OrchestratedDecision {
      const byStrategy: Record<StrategyId, BasicSignalKind> = {
        ORR_V3: engines.orr.evaluate(context),
        VWAP_FT: engines.vwapFt.evaluate(context),
        OSB: engines.osb.evaluate(context),
      };

      const orrSignal = byStrategy.ORR_V3;
      const vwapSignal = byStrategy.VWAP_FT;
      const osbSignal = byStrategy.OSB;

      // OR window: ORR priority when it wants to trade
      if (context.inOpeningRange && orrSignal !== 'NO_TRADE') {
        return {
          primary: {
            id: 'ORR_V3',
            kind: orrSignal,
            reason: 'orr-priority-in-or-window',
          },
          byStrategy,
        };
      }

      // Outside OR: consider VWAP FT and OSB
      const active: Array<{ id: StrategyId; kind: BasicSignalKind }> = [];
      if (vwapSignal !== 'NO_TRADE') active.push({ id: 'VWAP_FT', kind: vwapSignal });
      if (osbSignal !== 'NO_TRADE') active.push({ id: 'OSB', kind: osbSignal });

      if (!active.length) {
        return {
          primary: {
            id: 'ORR_V3',
            kind: 'NO_TRADE',
            reason: 'no-strategy-setup',
          },
          byStrategy,
        };
      }

      if (active.length === 1) {
        return {
          primary: {
            id: active[0].id,
            kind: active[0].kind,
          },
          byStrategy,
        };
      }

      const hasLong = active.some((s) => s.kind === 'LONG');
      const hasShort = active.some((s) => s.kind === 'SHORT');

      // Conflict: opposite directions → stand down
      if (hasLong && hasShort) {
        return {
          primary: {
            id: 'ORR_V3',
            kind: 'NO_TRADE',
            reason: 'conflict-between-strategies',
          },
          byStrategy,
        };
      }

      const vwapCandidate = active.find((s) => s.id === 'VWAP_FT');
      if (vwapCandidate) {
        return {
          primary: {
            id: vwapCandidate.id,
            kind: vwapCandidate.kind,
            reason: 'vwap-ft-preferred-when-aligned',
          },
          byStrategy,
        };
      }

      return {
        primary: {
          id: active[0].id,
          kind: active[0].kind,
        },
        byStrategy,
      };
    },
  };
}

// === RiskEngineV2 integration helper =======================================
// Pure helper that wraps RiskEngineV2 evaluateBatch so orchestrator callers
// can opt-in to risk evaluation without mutating existing behaviour.

export type OrchestratorRiskEvaluation = {
  draft: TicketDraft;
  decision: RiskDecision;
};

export function evaluateRiskForDrafts(
  drafts: TicketDraft[],
  ctx: RiskEngineContext,
): OrchestratorRiskEvaluation[] {
  const engine = createRiskEngineV2();
  const result = engine.evaluateBatch(drafts, ctx);
  return result.decisions;
}

// -----------------------------------------------------------------------------
// Phase 4 — Shared sizing hook
// -----------------------------------------------------------------------------
export function sizeDraftWithStake(
  draft: TicketDraft,
  sizing: {
    stakeDollars: number;
    tickValue: number;
    ticksToStop: number;
    rMultiple?: number | null;
  },
): TicketDraft {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computeAsAny: any = computePositionFromStake;
  const result = computeAsAny({
    stakeDollars: sizing.stakeDollars,
    tickValue: sizing.tickValue,
    ticksToStop: sizing.ticksToStop,
  });

  const rMultiple =
    sizing.rMultiple ?? (draft.stopPrice !== draft.entryPrice
      ? Math.abs(draft.targetPrice - draft.entryPrice) /
        Math.abs(draft.entryPrice - draft.stopPrice)
      : draft.rMultiple ?? null);

  return {
    ...draft,
    contracts:
      typeof result?.contracts === 'number'
        ? result.contracts
        : draft.contracts,
    riskDollars:
      typeof result?.riskDollars === 'number'
        ? result.riskDollars
        : draft.riskDollars ?? null,
    ticksToStop: sizing.ticksToStop,
    rMultiple,
  };
}

