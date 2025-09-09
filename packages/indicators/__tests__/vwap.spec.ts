import { ensureDefined } from '../../__tests__/helpers/assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { vwapSessionSeries, updateVwap, initialVwapState } from '../src/vwap.js';
import type { Bar1m } from '../src/types.js';

function loadBars(symbol: string): Bar1m[] {
  const lines = readFileSync(join(__dirname, 'golden', `${symbol}_1m_sample.csv`), 'utf-8')
    .trim()
    .split('\n')
    .slice(1);
  return lines.map((line) => {
    const [ts, open, high, low, close, volume] = line.split(',');
    return { ts, open: +open, high: +high, low: +low, close: +close, volume: +volume };
  });
}

describe('vwap', () => {
  const bars = loadBars('es');
  const sessionKeyOf = (() => {
    let idx = 0;
    return () => (idx++ < 25 ? 's1' : 's2');
  })();

  it('resets on session change', () => {
    const series = vwapSessionSeries(bars, sessionKeyOf);
    const tp = (bars[25].high + bars[25].low + bars[25].close) / 3;
    expect(series[25]).toBeCloseTo(tp, 6);
  });

  it('matches golden values', () => {
    const series = vwapSessionSeries(
      bars,
      (() => {
        let idx = 0;
        return () => (idx++ < 25 ? 's1' : 's2');
      })(),
    );
    const indices = [4, 9, 24, 25, 30];
    const expected = [103.834203, 108.387974, 119.598033, 129.14, 129.880562];
    indices.forEach((i, j) => {
      expect(series[i]).toBeCloseTo(expected[j], 6);
    });
  });

  it('incremental matches batch', () => {
    const series = vwapSessionSeries(
      bars,
      (() => {
        let idx = 0;
        return () => (idx++ < 25 ? 's1' : 's2');
      })(),
    );
    const inc: number[] = [];
    let state = initialVwapState();
    let idx = 0;
    for (const bar of bars) {
      const key = idx++ < 25 ? 's1' : 's2';
      const res = updateVwap(state, bar, key);
      state = res.state;
      inc.push(res.vwap);
    }
    expect(inc).toEqual(series);
  });
});
