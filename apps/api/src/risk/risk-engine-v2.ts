import { recordRiskDecisionEvent } from '../observability/events.js';

export type RiskReasonCode =
  | 'OK'
  | 'TRADING_DISABLED'
  | 'NEWS_HARD_BLOCK'
  | 'DAILY_DD_HARD_LIMIT'
  | 'STRATEGY_SESSION_CONTRACT_CAP'
  | 'STRATEGY_TICKET_SIZE_CAP'
  | 'INTERNAL_ERROR';

export interface RiskDecision {
  allowed: boolean;
  reason: string;
  codes: RiskReasonCode[];
  maxContractsAllowed: number | null;
  warnings: string[];
}

export interface RiskEngineContext {
  sessionKey: {
    symbol: string;
    sessionDateUtc: string;
  };
  accountConfig: {
    maxDailyLoss: number | null;
    maxTrailingDrawdown: number | null;
    tradingDisabled?: boolean;
  };
  strategyConfigs: Record<
    string,
    {
      enabled: boolean;
      maxContractsPerTicket: number | null;
      maxContractsPerSession: number | null;
      blockOnNews: boolean;
    }
  >;
  sessionStateSnapshot: {
    realizedPnl: number;
    unrealizedPnl: number;
    maxDrawdownToday: number;
    contractsOpenByStrategy: Record<string, number>;
  };
  flags: {
    hasNewsFlag: boolean;
  };
}

export interface TicketDraft {
  id: string;
  strategyId: string;
  symbol: string;
  sessionKey: {
    symbol: string;
    sessionDateUtc: string;
  };
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  contracts: number;
  riskDollars?: number | null;
  ticksToStop?: number | null;
  rMultiple?: number | null;
}

export interface RiskEngineV2Deps {
  readonly accountSnapshotProvider?: unknown;
  readonly exposureProvider?: unknown;
}

export interface RiskEngineV2 {
  evaluateDraft(draft: TicketDraft, ctx: RiskEngineContext): RiskDecision;
  evaluateBatch(
    drafts: TicketDraft[],
    ctx: RiskEngineContext
  ): {
    decisions: Array<{ draft: TicketDraft; decision: RiskDecision }>;
    summary: {
      blockedCount: number;
      allowedCount: number;
      hardBlockReasons: Record<string, number>;
      warningsCount: number;
    };
  };
}

export function createRiskEngineV2(_deps?: RiskEngineV2Deps): RiskEngineV2 {
  function evaluateDraft(draft: TicketDraft, ctx: RiskEngineContext): RiskDecision {
    const warnings: string[] = [];
    const codes: RiskReasonCode[] = [];

    const strategyConfig = ctx.strategyConfigs[draft.strategyId];

    if (ctx.accountConfig.tradingDisabled) {
      return {
        allowed: false,
        reason: 'Trading disabled by account configuration',
        codes: ['TRADING_DISABLED'],
        maxContractsAllowed: 0,
        warnings,
      };
    }

    if (!strategyConfig || !strategyConfig.enabled) {
      return {
        allowed: false,
        reason: 'Strategy is disabled or not configured',
        codes: ['INTERNAL_ERROR'],
        maxContractsAllowed: 0,
        warnings,
      };
    }

    if (ctx.flags.hasNewsFlag && strategyConfig.blockOnNews) {
      return {
        allowed: false,
        reason: 'Trading blocked due to session news flag',
        codes: ['NEWS_HARD_BLOCK'],
        maxContractsAllowed: 0,
        warnings,
      };
    }

    const maxPerTicket = strategyConfig.maxContractsPerTicket;
    const maxPerSession = strategyConfig.maxContractsPerSession;
    const openContracts =
      ctx.sessionStateSnapshot.contractsOpenByStrategy[draft.strategyId] ?? 0;

    let effectiveContracts = draft.contracts;

    if (maxPerTicket != null && draft.contracts > maxPerTicket) {
      codes.push('STRATEGY_TICKET_SIZE_CAP');
      warnings.push(
        `Requested contracts (${draft.contracts}) exceed per-ticket cap (${maxPerTicket}) for strategy ${draft.strategyId}`
      );
      effectiveContracts = maxPerTicket;
    }

    const projectedContracts = openContracts + effectiveContracts;

    if (maxPerSession != null && projectedContracts > maxPerSession) {
      codes.push('STRATEGY_SESSION_CONTRACT_CAP');
      const baseCodes: RiskReasonCode[] =
        codes.length > 0 ? codes : ['STRATEGY_SESSION_CONTRACT_CAP'];
      const uniqueCodes = Array.from(new Set<RiskReasonCode>(baseCodes));
      return {
        allowed: false,
        reason: `Strategy session contract cap exceeded for ${draft.strategyId} (current=${openContracts}, requested=${effectiveContracts}, cap=${maxPerSession})`,
        codes: uniqueCodes,
        maxContractsAllowed: 0,
        warnings,
      };
    }

    const finalCodes: RiskReasonCode[] = codes.length ? codes : ['OK'];
    const reason = codes.length ? 'OK with strategy caps applied' : 'OK';

    return {
      allowed: true,
      reason,
      codes: finalCodes,
      maxContractsAllowed: strategyConfig.maxContractsPerTicket ?? null,
      warnings,
    };
  }

  function evaluateBatch(
    drafts: TicketDraft[],
    ctx: RiskEngineContext
  ) {
    const decisions = drafts.map((draft) => {
      const decision = evaluateDraft(draft, ctx);
      return { draft, decision };
    });

    let blockedCount = 0;
    let allowedCount = 0;
    let warningsCount = 0;
    const hardBlockReasons: Record<string, number> = {};

    for (const { decision } of decisions) {
      if (decision.allowed) {
        allowedCount += 1;
      } else {
        blockedCount += 1;
        for (const code of decision.codes) {
          if (code !== 'OK') {
            hardBlockReasons[code] = (hardBlockReasons[code] ?? 0) + 1;
          }
        }
      }
      warningsCount += decision.warnings.length;
    }

    recordRiskDecisionEvent({
      sessionKey: `${ctx.sessionKey.symbol}:${ctx.sessionKey.sessionDateUtc}`,
      draftCount: drafts.length,
      totals: {
        blockedCount,
        allowedCount,
        warningsCount,
      },
      hardBlockReasons,
    });

    return {
      decisions,
      summary: {
        blockedCount,
        allowedCount,
        hardBlockReasons,
        warningsCount,
      },
    };
  }

  return {
    evaluateDraft,
    evaluateBatch,
  };
}
