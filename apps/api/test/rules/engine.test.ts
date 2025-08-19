import { checkCompliance, AccountState } from '../../src/services/rules/engine';

describe('Compliance Rule Engine', () => {
  const base: AccountState = {
    phase: 'evaluation',
    balance: 10000,
    equityHigh: 10000,
    openPositions: [],
    tradeHistory: [],
    dayPnL: { d1: 100, d2: 100, d3: 100, d4: 100, d5: 100, d6: 100, d7: 100 },
    trailingDrawdown: 9000,
    resetsUsed: 0,
    isEndOfDay: false,
    tradingDuringNews: false,
  };

  // Evaluation rules
  describe('Profit Target', () => {
    it('passes when target met', () => {
      const state = { ...base, balance: 13000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when below target', () => {
      const state = { ...base, balance: 1000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('eval-profit-target');
    });
  });

  describe('Trailing Drawdown', () => {
    it('passes within buffer', () => {
      const state = { ...base, balance: 9500 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when breached', () => {
      const state = { ...base, balance: 8000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('eval-trailing-dd');
    });
  });

  describe('Minimum Trading Days', () => {
    it('passes with enough days', () => {
      const res = checkCompliance(base);
      expect(res.ok).toBe(true);
    });
    it('fails with insufficient days', () => {
      const state = { ...base, dayPnL: { d1: 100, d2: 100 } };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('eval-min-days');
    });
  });

  describe('End of Day Flat', () => {
    it('passes when flat', () => {
      const state = { ...base, isEndOfDay: true };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when holding positions', () => {
      const state = { ...base, isEndOfDay: true, openPositions: [{ contracts: 1 }] };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('eval-eod-flat');
    });
  });

  describe('Account Resets', () => {
    it('passes under limit', () => {
      const state = { ...base, resetsUsed: 1 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails over limit', () => {
      const state = { ...base, resetsUsed: 2 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('eval-resets');
    });
  });

  // Funded rules
  describe('Stop-Loss Required', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes with stop loss', () => {
      const state = { ...fundedBase, openPositions: [{ contracts: 1, stopLoss: 10 }] };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails without stop loss', () => {
      const state = { ...fundedBase, openPositions: [{ contracts: 1 }] };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('funded-stoploss');
    });
  });

  describe('Consistency Rule', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes with balanced days', () => {
      const dayPnL = { a: 100, b: 100, c: 100, d: 100 };
      const state = { ...fundedBase, dayPnL };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails with heavy day', () => {
      const dayPnL = { a: 500, b: 100 };
      const state = { ...fundedBase, dayPnL };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('funded-consistency');
    });
  });

  describe('Half-Contract Scaling', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes under limit', () => {
      const state = { ...fundedBase, openPositions: [{ contracts: 2, stopLoss: 10 }] };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails over limit', () => {
      const state = { ...fundedBase, openPositions: [{ contracts: 6, stopLoss: 10 }] };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('funded-scaling');
    });
  });

  describe('No Windfall', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes with small day', () => {
      const dayPnL = { a: 100, b: 90, c: 80, d: 70, e: 60 };
      const state = { ...fundedBase, dayPnL };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails with windfall day', () => {
      const dayPnL = { a: 1000, b: 100, c: 90, d: 80, e: 70 };
      const state = { ...fundedBase, dayPnL };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations.some(v => v.id === 'funded-windfall')).toBe(true);
    });
  });

  describe('Trailing DD Lock', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes above lock', () => {
      const state = { ...fundedBase, trailingDrawdown: 6000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails below lock', () => {
      const state = { ...fundedBase, trailingDrawdown: 4000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('funded-dd-lock');
    });
  });

  describe('News Trading Ban', () => {
    const fundedBase = { ...base, phase: 'funded' as const };
    it('passes when no news trading', () => {
      const state = { ...fundedBase, tradingDuringNews: false };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when trading during news', () => {
      const state = { ...fundedBase, tradingDuringNews: true };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('funded-news');
    });
  });

  // Payout rules
  describe('Safety Net', () => {
    const payoutBase: AccountState = { ...base, phase: 'payout' };
    it('passes with cushion', () => {
      const state = { ...payoutBase, balance: 2000 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when below net', () => {
      const state = { ...payoutBase, balance: 500 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('payout-safety-net');
    });
  });

  describe('Payout Cadence', () => {
    const payoutBase: AccountState = { ...base, phase: 'payout' };
    it('passes with spacing', () => {
      const history = ['2025-01-01', '2025-01-10'];
      const state = { ...payoutBase, payoutHistory: history };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails when too soon', () => {
      const history = ['2025-01-01', '2025-01-05'];
      const state = { ...payoutBase, payoutHistory: history };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('payout-cadence');
    });
  });

  describe('Profit Split', () => {
    const payoutBase: AccountState = { ...base, phase: 'payout' };
    it('passes within split', () => {
      const state = { ...payoutBase, payoutRequestPct: 0.5 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(true);
    });
    it('fails over split', () => {
      const state = { ...payoutBase, payoutRequestPct: 0.95 };
      const res = checkCompliance(state);
      expect(res.ok).toBe(false);
      expect(res.violations[0].id).toBe('payout-profit-split');
    });
  });
});
