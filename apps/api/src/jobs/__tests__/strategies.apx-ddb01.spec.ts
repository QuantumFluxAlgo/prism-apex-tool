import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { publish, subscribe, resetBusForTests } from '../../lib/bus.js';
import {
  startStrategies,
  stopStrategies,
  strategies,
  type BarMessage,
  type Suggestion,
} from '../strategies.js';

describe('APX-DDB-01 strategy integration', () => {
  const suggestions: Suggestion[] = [];
  let unsubscribe: (() => void) | undefined;

  beforeEach(async () => {
    resetBusForTests();
    suggestions.length = 0;
    process.env.STRATEGIES_CONFIG_PATH = path.resolve('fixtures/strategies.config.json');
    unsubscribe = subscribe<Suggestion>('suggestion', (s) => {
      suggestions.push(s);
    });
    await startStrategies();
  });

  afterEach(async () => {
    await stopStrategies();
    unsubscribe?.();
    resetBusForTests();
    delete process.env.STRATEGIES_CONFIG_PATH;
    strategies.counts['APX-DDB-01'] = 0;
  });

  it('emits a single APX-DDB-01 suggestion once prior day data is present', () => {
    const symbol = 'ES';
    const contract = 'ESZ4';
    const mondayOpen = new Date('2024-06-03T13:30:00.000Z');
    const mondayBars = [
      { high: 5310, low: 5298, close: 5305, volume: 1000 },
      { high: 5320, low: 5305, close: 5315, volume: 1000 },
      { high: 5330, low: 5315, close: 5325, volume: 1000 },
      { high: 5332, low: 5320, close: 5328, volume: 1000 },
      { high: 5334.75, low: 5325, close: 5330, volume: 1000 },
    ];

    mondayBars.forEach((bar, idx) => {
      const ts = new Date(mondayOpen.getTime() + idx * 60_000).toISOString();
      publish<BarMessage>('bars.1m', {
        symbol,
        contract,
        ts,
        open: bar.close,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        session: 'RTH',
      });
    });

    expect(suggestions).toHaveLength(0);

    const tuesdayOpen = new Date('2024-06-04T13:30:00.000Z');
    const tuesdayBars = [
      { high: 5336, low: 5330, close: 5335, volume: 1200 },
      { high: 5338, low: 5332, close: 5336, volume: 1100 },
    ];

    tuesdayBars.forEach((bar, idx) => {
      const ts = new Date(tuesdayOpen.getTime() + idx * 60_000).toISOString();
      publish<BarMessage>('bars.1m', {
        symbol,
        contract,
        ts,
        open: bar.close,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        session: 'RTH',
      });
    });

    expect(suggestions).toHaveLength(1);
    const suggestion = suggestions[0];
    expect(suggestion.meta.strategy).toBe('APX-DDB-01');
    expect(suggestion.entry).toBeCloseTo(5334.25, 5);
    expect(suggestion.stop).toBeCloseTo(5331.25, 5);
    expect(suggestion.target).toBeCloseTo(5343.25, 5);
    expect(suggestion.meta.rr).toBeCloseTo(3, 5);
    expect(suggestion.meta.weeklyVwap).toBeGreaterThan(0);
    expect(suggestion.meta.priorHigh).toBeCloseTo(5334.75, 5);
    expect(suggestion.meta.stopTicks).toBe(12);
    expect(suggestion.meta.bufferTicks).toBe(2);
    expect(strategies.counts['APX-DDB-01']).toBe(1);

    const extraTs = new Date(tuesdayOpen.getTime() + 2 * 60_000).toISOString();
    publish<BarMessage>('bars.1m', {
      symbol,
      contract,
      ts: extraTs,
      open: 5335,
      high: 5337,
      low: 5333,
      close: 5334,
      volume: 1000,
      session: 'RTH',
    });

    expect(suggestions).toHaveLength(1);
  });
});
