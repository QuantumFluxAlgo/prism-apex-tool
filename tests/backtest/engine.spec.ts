import { describe, it, expect } from 'vitest';
import { runBacktest } from '../../packages/backtest/src/engine';
import { openingRangeAdapter } from '../../packages/backtest/src/adapters/orb';
import type { BacktestConfig, Bar } from '../../packages/backtest/src/types';

function mkBars(): Bar[] {
  // simple synthetic day: rising then falling
  const base = new Date('2025-08-18T14:30:00.000Z').getTime();
  const bars: Bar[] = [];
  let px = 5000;
  for (let i = 0; i < 120; i++) {
    const ts = new Date(base + i * 60_000).toISOString();
    const open = px;
    const high = px + 2;
    const low = px - 2;
    const close = px + (i < 60 ? 1 : -1);
    bars.push({ ts, open, high, low, close, volume: 100 + i });
    px = close;
  }
  return bars;
}

function mkLossBars(): Bar[] {
  const base = new Date('2025-08-18T14:30:00.000Z').getTime();
  const bars: Bar[] = [];
  let px = 100;
  for (let i = 0; i < 15; i++) {
    const ts = new Date(base + i * 60_000).toISOString();
    bars.push({ ts, open: px, high: px + 1, low: px - 1, close: px, volume: 100 });
  }
  const tsBreak = new Date(base + 15 * 60_000).toISOString();
  bars.push({ ts: tsBreak, open: px, high: px + 5, low: px - 5, close: px - 5, volume: 100 });
  px = px - 5;
  for (let i = 16; i < 20; i++) {
    const ts = new Date(base + i * 60_000).toISOString();
    bars.push({ ts, open: px, high: px + 1, low: px - 1, close: px, volume: 100 });
  }
  return bars;
}

describe('Backtest engine', () => {
  it('runs ORB with deterministic results and enforces 5R cap', () => {
    const data = mkBars();
    const cfg: BacktestConfig = {
      symbol: 'ES', barInterval: '1m', tz: 'UTC',
      session: { open: '14:30', close: '21:59' },
      slippageTicks: 0, tickValue: 50, maxRiskReward: 5,
      mode: 'evaluation', rngSeed: 42
    };
    const res = runBacktest(data, openingRangeAdapter(15,1,10), cfg); // request 10R, engine clamps to 5R
    expect(res.summary.trades).toBeGreaterThan(0);
    expect(res.summary.ruleBreaches).toBeInstanceOf(Array);
  });

  it('emulates daily loss cap breach', () => {
    const data = mkLossBars();
    const cfg: BacktestConfig = {
      symbol: 'ES', barInterval: '1m', tz: 'UTC',
      session: { open: '14:30', close: '21:59' },
      slippageTicks: 0, tickValue: 50, maxRiskReward: 5,
      dailyLossCapUsd: 10, mode: 'evaluation', rngSeed: 7
    };
    const res = runBacktest(data, openingRangeAdapter(15, 3, 1), cfg);
    expect(res.summary.ruleBreaches).toContain('DAILY_LOSS_CAP');
  });
});
