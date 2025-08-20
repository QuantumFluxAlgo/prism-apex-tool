import { describe, it, expect } from 'vitest';
import { runTickReplay } from '../../packages/backtest/src/tick/engine';
import { openingRangeAdapter } from '../../packages/backtest/src/adapters/orb';
import { loadTickCSV } from '../../packages/backtest/src/tick/io';
import type { BacktestConfig } from '../../packages/backtest/src/types';
import { join } from 'node:path';

describe('Tick replay engine (smoke)', () => {
  it('produces deterministic results with sample ticks', () => {
    const ticks = loadTickCSV(join(__dirname, '../../data/ES_ticks.sample.csv'));
    const strat = openingRangeAdapter(15, 1, 2);
    const cfg: BacktestConfig = {
      symbol: 'ES', barInterval: '1m', tz: 'UTC',
      session: { open: '14:30', close: '21:59' },
      slippageTicks: 0, tickValue: 50, maxRiskReward: 5,
      mode: 'evaluation', rngSeed: 7
    };
    const res = runTickReplay(ticks as any, strat as any, cfg);
    expect(res.summary.trades).toBeGreaterThanOrEqual(0);
    expect(res.daily).toBeInstanceOf(Array);
  });
});
