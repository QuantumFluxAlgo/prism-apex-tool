import { describe, expect, test } from 'vitest';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { EngineBar } from './bars.js';
import { applySafetyEnvelope } from './safetyEnvelope.js';

function makeBars(): EngineBar[] {
  const base = new Date('2025-01-15T14:30:00Z').getTime();
  return Array.from({ length: 30 }).map((_, idx) => {
    const ts = new Date(base + idx * 60_000).toISOString();
    return {
      timestamp: ts,
      open: 100 + idx * 0.25,
      high: 100.75 + idx * 0.25,
      low: 99.5 + idx * 0.25,
      close: 100.5 + idx * 0.25,
      volume: 1_000 + idx,
    };
  });
}

function makeSignal(overrides: Partial<EngineSignal> = {}): EngineSignal {
  const bars = makeBars();
  const base: EngineSignal = {
    id: 'sig-001',
    timestamp: bars[5].timestamp,
    direction: 'LONG',
    price: 100,
    entryPrice: 101,
    stopPrice: 99,
    targetPrice: 103,
    reason: 'test-signal',
  };
  return { ...base, ...overrides };
}

describe('applySafetyEnvelope', () => {
  test('approves clean long signals', () => {
    const bars = makeBars();
    const signal = makeSignal();
    const result = applySafetyEnvelope([signal], bars);
    expect(result.approved).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  test('rejects when prices are invalid', () => {
    const bars = makeBars();
    const signal = makeSignal({ entryPrice: 0 });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.approved).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('invalid-price-fields');
  });

  test('rejects inverted long ordering', () => {
    const bars = makeBars();
    const signal = makeSignal({ stopPrice: 200 });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('invalid-long-ordering');
  });

  test('rejects inverted short ordering', () => {
    const bars = makeBars();
    const base = makeSignal({
      direction: 'SHORT',
      entryPrice: 100,
      stopPrice: 90,
      targetPrice: 80,
    });
    const signal: EngineSignal = { ...base, stopPrice: 80, targetPrice: 90 };
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('invalid-short-ordering');
  });

  test('rejects timestamp out of range', () => {
    const bars = makeBars();
    const signal = makeSignal({
      timestamp: '2024-01-01T00:00:00Z',
    });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('timestamp-out-of-range');
  });

  test('rejects non-increasing timestamps', () => {
    const bars = makeBars();
    const first = makeSignal({ id: 'sig-1', timestamp: bars[10].timestamp });
    const second = makeSignal({
      id: 'sig-2',
      timestamp: bars[10].timestamp,
    });
    const result = applySafetyEnvelope([first, second], bars);
    expect(result.approved).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('timestamp-non-increasing');
  });

  test('rejects NaN or infinite prices', () => {
    const bars = makeBars();
    const signal = makeSignal({ targetPrice: Number.POSITIVE_INFINITY });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('invalid-price-fields');
  });

  test('rejects absurd price spread', () => {
    const bars = makeBars();
    const signal = makeSignal({ targetPrice: 10_000_000 });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('absurd-price-range');
  });

  test('rejects when bar data insufficient', () => {
    const bars = makeBars().slice(0, 5);
    const signal = makeSignal();
    const result = applySafetyEnvelope([signal], bars);
    expect(result.approved).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('invalid-bar-data');
  });

  test('rejects when associated bar is unrealistic', () => {
    const bars = makeBars();
    bars[6] = {
      ...bars[6],
      high: 10_000,
      low: 1,
    };
    const signal = makeSignal({ timestamp: bars[6].timestamp });
    const result = applySafetyEnvelope([signal], bars);
    expect(result.rejected[0].reason).toContain('bar-range-too-wide');
  });
});
