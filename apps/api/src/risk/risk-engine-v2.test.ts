import { describe, expect, it } from 'vitest';
import {
  createRiskEngineV2,
  type RiskEngineContext,
  type TicketDraft,
} from './risk-engine-v2.js';

function makeBaseContext(
  overrides: Partial<RiskEngineContext> = {}
): RiskEngineContext {
  return {
    sessionKey: {
      symbol: 'ES',
      sessionDateUtc: '2025-01-15',
    },
    accountConfig: {
      maxDailyLoss: null,
      maxTrailingDrawdown: null,
      tradingDisabled: false,
    },
    strategyConfigs: {
      ORR_V3: {
        enabled: true,
        maxContractsPerTicket: 4,
        maxContractsPerSession: 12,
        blockOnNews: true,
      },
    },
    sessionStateSnapshot: {
      realizedPnl: 0,
      unrealizedPnl: 0,
      maxDrawdownToday: 0,
      contractsOpenByStrategy: {
        ORR_V3: 0,
      },
    },
    flags: {
      hasNewsFlag: false,
    },
    ...overrides,
  };
}

function makeDraft(overrides: Partial<TicketDraft> = {}): TicketDraft {
  return {
    id: 'draft-1',
    strategyId: 'ORR_V3',
    symbol: 'ES',
    sessionKey: {
      symbol: 'ES',
      sessionDateUtc: '2025-01-15',
    },
    side: 'LONG',
    entryPrice: 100,
    stopPrice: 99,
    targetPrice: 102,
    contracts: 1,
    ...overrides,
  };
}

describe('RiskEngineV2 per-strategy caps', () => {
  it('allows a basic draft when trading is enabled and no news flag', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext();
    const draft = makeDraft();

    const decision = engine.evaluateDraft(draft, ctx);

    expect(decision.allowed).toBe(true);
    expect(decision.codes).toEqual(['OK']);
    expect(decision.maxContractsAllowed).toBe(4);
    expect(decision.warnings).toHaveLength(0);
  });

  it('blocks when tradingDisabled is true', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      accountConfig: {
        maxDailyLoss: null,
        maxTrailingDrawdown: null,
        tradingDisabled: true,
      },
    });
    const draft = makeDraft();

    const decision = engine.evaluateDraft(draft, ctx);

    expect(decision.allowed).toBe(false);
    expect(decision.codes).toContain('TRADING_DISABLED');
  });

  it('blocks when session has news and strategy is configured to blockOnNews', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      flags: {
        hasNewsFlag: true,
      },
    });
    const draft = makeDraft();

    const decision = engine.evaluateDraft(draft, ctx);

    expect(decision.allowed).toBe(false);
    expect(decision.codes).toContain('NEWS_HARD_BLOCK');
  });

  it('clamps ticket size to per-ticket cap and records a warning', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      strategyConfigs: {
        ORR_V3: {
          enabled: true,
          maxContractsPerTicket: 4,
          maxContractsPerSession: 20,
          blockOnNews: true,
        },
      },
    });

    const draft = makeDraft({
      contracts: 10,
    });

    const decision = engine.evaluateDraft(draft, ctx);

    expect(decision.allowed).toBe(true);
    expect(decision.codes).toContain('STRATEGY_TICKET_SIZE_CAP');
    expect(decision.reason).toBe('OK with strategy caps applied');
    expect(decision.maxContractsAllowed).toBe(4);
    expect(decision.warnings.length).toBeGreaterThan(0);
  });

  it('blocks when projected session contracts exceed maxContractsPerSession', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      strategyConfigs: {
        ORR_V3: {
          enabled: true,
          maxContractsPerTicket: 10,
          maxContractsPerSession: 5,
          blockOnNews: true,
        },
      },
      sessionStateSnapshot: {
        realizedPnl: 0,
        unrealizedPnl: 0,
        maxDrawdownToday: 0,
        contractsOpenByStrategy: {
          ORR_V3: 4,
        },
      },
    });

    const draft = makeDraft({
      contracts: 2,
    });

    const decision = engine.evaluateDraft(draft, ctx);

    expect(decision.allowed).toBe(false);
    expect(decision.codes).toContain('STRATEGY_SESSION_CONTRACT_CAP');
    expect(decision.maxContractsAllowed).toBe(0);
  });

  it('evaluates a batch and aggregates summary correctly for mixed decisions', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      strategyConfigs: {
        ORR_V3: {
          enabled: true,
          maxContractsPerTicket: 4,
          maxContractsPerSession: 5,
          blockOnNews: true,
        },
      },
      sessionStateSnapshot: {
        realizedPnl: 0,
        unrealizedPnl: 0,
        maxDrawdownToday: 0,
        contractsOpenByStrategy: {
          ORR_V3: 3,
        },
      },
    });

    const drafts: TicketDraft[] = [
      makeDraft({ id: 'allowed', contracts: 1 }),
      makeDraft({ id: 'blocked-session-cap', contracts: 3 }),
      makeDraft({ id: 'oversized-and-blocked', contracts: 10 }),
    ];

    const result = engine.evaluateBatch(drafts, ctx);

    expect(result.decisions).toHaveLength(3);

    const allowed = result.decisions.filter((d) => d.decision.allowed);
    const blocked = result.decisions.filter((d) => !d.decision.allowed);

    expect(allowed.length).toBe(1);
    expect(blocked.length).toBe(2);

    expect(result.summary.allowedCount).toBe(1);
    expect(result.summary.blockedCount).toBe(2);
    expect(result.summary.hardBlockReasons.STRATEGY_SESSION_CONTRACT_CAP).toBe(2);
    expect(result.summary.warningsCount).toBeGreaterThanOrEqual(1);
  });

  it('evaluates a batch and aggregates summary correctly for all blocked by news', () => {
    const engine = createRiskEngineV2();
    const ctx = makeBaseContext({
      flags: {
        hasNewsFlag: true,
      },
    });

    const drafts: TicketDraft[] = [
      makeDraft({ id: 'd1' }),
      makeDraft({ id: 'd2' }),
    ];

    const result = engine.evaluateBatch(drafts, ctx);

    expect(result.decisions).toHaveLength(2);
    expect(result.summary.blockedCount).toBe(2);
    expect(result.summary.allowedCount).toBe(0);
    expect(result.summary.hardBlockReasons.NEWS_HARD_BLOCK).toBe(2);
  });
});
