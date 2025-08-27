import { describe, it, expect } from 'vitest';
import { guardApexFundingRules, OrderParams } from '../src/apex.js';
import { loadApexRules } from '../src/config.js';

const cfg = loadApexRules();

function makeCtx(overrides: Partial<Parameters<typeof guardApexFundingRules>[1]> = {}) {
  return {
    mode: 'funded' as const,
    bufferCleared: true,
    maxContractsAllowed: 10,
    now: new Date('2023-06-01T12:00:00Z'),
    cfg,
    ...overrides,
  };
}

describe('guardApexFundingRules', () => {
  it('blocks when rr below min', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, stopLoss: 99, takeProfit: 101.4 };
    const res = guardApexFundingRules(t, makeCtx());
    expect(res).toEqual({ allow: false, reason: 'RR_LT_MIN' });
  });

  it('allows when rr at min', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, stopLoss: 99, takeProfit: 101.5 };
    const res = guardApexFundingRules(t, makeCtx());
    expect(res.allow).toBe(true);
  });

  it('blocks when rr above max', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, stopLoss: 99, takeProfit: 105.1 };
    const res = guardApexFundingRules(t, makeCtx());
    expect(res).toEqual({ allow: false, reason: 'RR_GT_MAX' });
  });

  it('blocks when missing stop', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, takeProfit: 101.5 } as any;
    const res = guardApexFundingRules(t, makeCtx());
    expect(res).toEqual({ allow: false, reason: 'STOP_REQUIRED' });
  });

  it('blocks in EOD window', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, stopLoss: 99, takeProfit: 101.5 };
    const res = guardApexFundingRules(t, makeCtx({ now: new Date('2023-06-01T20:59:00Z') }));
    expect(res).toEqual({ allow: false, reason: 'EOD_FLAT_WINDOW' });
  });

  it('passes in evaluation mode without rr enforcement', () => {
    const t: OrderParams = { qty: 1, entryPrice: 100, stopLoss: 99, takeProfit: 101.4 };
    const res = guardApexFundingRules(t, makeCtx({ mode: 'evaluation' }));
    expect(res.allow).toBe(true);
  });
});
