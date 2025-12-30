import { describe, it, expect } from 'vitest';
import {
  computeSessionMetricsForSymbol,
  computeSessionMetricsForSymbols,
  RawBar,
} from './populate-session-metrics.js';
import { SessionMetricsPopulationContext } from './types.js';

function makeContext(overrides: Partial<SessionMetricsPopulationContext> = {}): SessionMetricsPopulationContext {
  return {
    targetSessionDate: '2025-11-14',
    symbols: ['ES'],
    ...overrides,
  };
}

function buildBars(timestamps: string[], prices: { open: number; high: number; low: number; close: number }[], volumes: number[]): RawBar[] {
  return timestamps.map((ts, idx) => ({
    ts,
    open: prices[idx].open,
    high: prices[idx].high,
    low: prices[idx].low,
    close: prices[idx].close,
    volume: volumes[idx],
  }));
}

describe('computeSessionMetricsForSymbol', () => {
  it('returns ERROR and NO_BARS when there are no bars', () => {
    const ctx = makeContext();
    const result = computeSessionMetricsForSymbol('ES', ctx.targetSessionDate, 'RTH', [], ctx);

    expect(result.sessionQualityFlag).toBe('ERROR');
    expect(result.sessionSkipReason).toBe('NO_BARS');
    expect(result.sessionStartTs).toBeNull();
    expect(result.sessionEndTs).toBeNull();
    expect(result.sessionAtrPoints).toBeNull();
  });

  it('computes basic intraday range and non-null ATR when bars exist', () => {
    const ctx = makeContext();
    const timestamps = [
      '2025-11-14T14:30:00.000Z',
      '2025-11-14T14:31:00.000Z',
      '2025-11-14T14:32:00.000Z',
      '2025-11-14T14:33:00.000Z',
    ];
    const prices = [
      { open: 100, high: 101, low: 99.5, close: 100.5 },
      { open: 100.5, high: 101.5, low: 100, close: 101 },
      { open: 101, high: 102, low: 100.5, close: 101.5 },
      { open: 101.5, high: 102.5, low: 101, close: 102 },
    ];
    const volumes = [10, 20, 30, 40];

    const bars = buildBars(timestamps, prices, volumes);
    const result = computeSessionMetricsForSymbol('ES', ctx.targetSessionDate, 'RTH', bars, ctx);

    expect(result.sessionStartTs).toBe(timestamps[0]);
    expect(result.sessionEndTs).toBe(timestamps[timestamps.length - 1]);

    const expectedHigh = Math.max(...prices.map((p) => p.high));
    const expectedLow = Math.min(...prices.map((p) => p.low));
    const expectedRange = expectedHigh - expectedLow;

    expect(result.intradayRangePoints).toBeCloseTo(expectedRange);
    expect(result.sessionAtrPoints).not.toBeNull();
    expect(result.sessionAtrPoints as number).toBeGreaterThan(0);
    expect(result.volRegime).toBe('NORMAL');
  });

  it('marks OR window using first 30 minutes and sets OR width and ratio when ATR exists', () => {
    const ctx = makeContext();
    const timestamps = [
      // First 30 minutes
      '2025-11-14T14:30:00.000Z',
      '2025-11-14T14:35:00.000Z',
      '2025-11-14T14:40:00.000Z',
      // Outside 30 minutes
      '2025-11-14T15:10:00.000Z',
    ];
    const prices = [
      { open: 100, high: 101, low: 99.5, close: 100.5 },
      { open: 100.5, high: 102, low: 100, close: 101.5 },
      { open: 101.5, high: 103, low: 101, close: 102.5 },
      { open: 102.5, high: 104, low: 102, close: 103.5 },
    ];
    const volumes = [10, 20, 30, 40];

    const bars = buildBars(timestamps, prices, volumes);
    const result = computeSessionMetricsForSymbol('ES', ctx.targetSessionDate, 'RTH', bars, ctx);

    expect(result.orStartTs).not.toBeNull();
    expect(result.orEndTs).not.toBeNull();
    expect(result.orLengthMinutes).toBe(30);

    // Only first 3 bars are in OR window
    const orHigh = Math.max(prices[0].high, prices[1].high, prices[2].high);
    const orLow = Math.min(prices[0].low, prices[1].low, prices[2].low);
    const expectedOrWidth = orHigh - orLow;

    expect(result.orWidthPoints).toBeCloseTo(expectedOrWidth);
    if (result.sessionAtrPoints !== null) {
      expect(result.orWidthToAtrRatio).not.toBeNull();
      expect(result.orWidthToAtrRatio as number).toBeGreaterThan(0);
    }
  });

  it('computes VWAP open/close and slope classification', () => {
    const ctx = makeContext();
    const timestamps = [
      '2025-11-14T14:30:00.000Z',
      '2025-11-14T14:35:00.000Z',
      '2025-11-14T14:40:00.000Z',
      '2025-11-14T15:00:00.000Z',
    ];
    const prices = [
      { open: 100, high: 100.5, low: 99.5, close: 100 },   // early
      { open: 100.5, high: 101, low: 100, close: 100.8 },  // up a bit
      { open: 101, high: 101.5, low: 100.5, close: 101.3 },// up more
      { open: 101.5, high: 102, low: 101, close: 101.8 },  // further up
    ];
    const volumes = [10, 10, 10, 10];

    const bars = buildBars(timestamps, prices, volumes);
    const result = computeSessionMetricsForSymbol('ES', ctx.targetSessionDate, 'RTH', bars, ctx);

    expect(result.vwapOpenValue).not.toBeNull();
    expect(result.vwapCloseValue).not.toBeNull();
    expect(result.vwapSlope).toBe('UP');
  });
});

describe('computeSessionMetricsForSymbols', () => {
  it('returns one result per symbol from grouped bars using context.symbols', () => {
    const ctx = makeContext({ symbols: ['ES', 'NQ'] });

    const timestampsEs = [
      '2025-11-14T14:30:00.000Z',
      '2025-11-14T14:31:00.000Z',
    ];
    const pricesEs = [
      { open: 100, high: 101, low: 99.5, close: 100.5 },
      { open: 100.5, high: 101.5, low: 100, close: 101 },
    ];
    const volumesEs = [10, 20];

    const timestampsNq = [
      '2025-11-14T14:30:00.000Z',
      '2025-11-14T14:31:00.000Z',
    ];
    const pricesNq = [
      { open: 15000, high: 15010, low: 14990, close: 15005 },
      { open: 15005, high: 15015, low: 14995, close: 15010 },
    ];
    const volumesNq = [5, 10];

    const barsBySymbol: Record<string, RawBar[]> = {
      ES: buildBars(timestampsEs, pricesEs, volumesEs),
      NQ: buildBars(timestampsNq, pricesNq, volumesNq),
    };

    const results = computeSessionMetricsForSymbols(ctx, barsBySymbol);

    expect(results).toHaveLength(2);

    const symbols = results.map((r) => r.symbol).sort();
    expect(symbols).toEqual(['ES', 'NQ']);

    for (const r of results) {
      expect(r.sessionDate).toBe(ctx.targetSessionDate);
      expect(r.sessionType).toBe('RTH'); // current default in implementation
      expect(r.sessionStartTs).not.toBeNull();
      expect(r.sessionEndTs).not.toBeNull();
    }
  });
});
