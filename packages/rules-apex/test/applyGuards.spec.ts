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
  const ctx = {
    phase: 'eval' as const,
    account: { id: 'acc', maxContracts: 5 },
    bufferCleared: false,
    recentSizes: [2],
    contract: 'ESZ4',
  };

  it('accepts and returns ticket', () => {
    const r = applyGuardWithSizing(base, ctx);
    expect(r.accepted).toBe(true);
    expect(r.ticket?.qty).toBe(2);
    expect(r.ticket?.symbol).toBe('ESZ4');
  });

  it('rejects bad rr', () => {
    const r = applyGuardWithSizing({ ...base, target: 100.5 }, ctx);
    expect(r.accepted).toBe(false);
  });
});
