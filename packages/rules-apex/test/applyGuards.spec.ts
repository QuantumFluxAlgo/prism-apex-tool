import { applyGuardWithSizing } from '../src/applyGuards.js';
import { Suggestion } from '../src/types.js';

describe('applyGuardWithSizing', () => {
  const base: Suggestion = {
    symbol: 'ES',
    side: 'BUY',
    entry: 100,
    stop: 99,
    qty: 4,
    strategy: 'OSB',
    target: 102,
  };
  const ctxEval = {
    phase: 'eval' as const,
    account: { id: 'acc', maxContracts: 5 },
    bufferCleared: false,
    recentSizes: [2],
    contract: 'ESZ4',
  };

  it('half-size enforced when buffer not cleared', () => {
    const r = applyGuardWithSizing(base, ctxEval);
    expect(r.accepted).toBe(true);
    expect(r.ticket?.qty).toBe(2);
  });

  it('rejects missing stop in funded', () => {
    const r = applyGuardWithSizing({ ...base, stop: undefined }, { ...ctxEval, phase: 'funded' });
    expect(r.accepted).toBe(false);
  });

  it('accepts missing stop in eval with advisory', () => {
    const r = applyGuardWithSizing({ ...base, stop: undefined }, ctxEval);
    expect(r.accepted).toBe(true);
    expect(r.ticket?.meta.guardrails).toContain('stop-optional');
  });

  it('anti-windfall caps sudden jump', () => {
    const r = applyGuardWithSizing(
      { ...base, qty: 5 },
      { ...ctxEval, phase: 'funded', recentSizes: [1], bufferCleared: true },
    );
    expect(r.accepted).toBe(false);
  });
});
