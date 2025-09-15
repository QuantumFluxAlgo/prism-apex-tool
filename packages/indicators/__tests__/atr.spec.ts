import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { atrWilderSeries, trueRange } from '../src/atr.js';
import type { Bar1m } from '../src/types.js';

function loadBars(symbol: string): Bar1m[] {
  const filePath = join(
    dirname(fileURLToPath(import.meta.url)),
    'golden',
    `${symbol}_1m_sample.csv`,
  );
  const lines = readFileSync(filePath, 'utf-8').trim().split('\n').slice(1);
  return lines.map((line) => {
    const [ts, open, high, low, close, volume] = line.split(',');
    return { ts, open: +open, high: +high, low: +low, close: +close, volume: +volume };
  });
}

describe('atr wilder', () => {
  const bars = loadBars('es');
  it('matches expected series', () => {
    const series = atrWilderSeries(bars, 14);
    const expected: (number | null)[] = [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      2.0614285714285705,
      2.042040816326529,
      2.0240379008746348,
      1.964463765097875,
      1.9091449247337409,
      1.8449202872527588,
      1.7874259810204183,
    ];
    expected.forEach((v, i) => {
      if (v === null) {
        expect(series[i]).toBeNull();
      } else {
        expect(series[i]).toBeCloseTo(v, 12);
      }
    });
  });

  it('converts to ticks', () => {
    const series = atrWilderSeries(bars, 14, { asTicks: true, tickSpec: { tickSize: 0.25 } });
    expect(series[13]).toBeCloseTo(8.2457142857, 6);
  });

  it('computes true range', () => {
    const tr = trueRange(bars[1], bars[0].close);
    const manual = Math.max(
      bars[1].high - bars[1].low,
      Math.abs(bars[1].high - bars[0].close),
      Math.abs(bars[1].low - bars[0].close),
    );
    expect(tr).toBeCloseTo(manual, 10);
  });
});
