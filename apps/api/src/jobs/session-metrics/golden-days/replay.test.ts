import { describe, it, expect } from 'vitest';
import {
  loadGoldenDayFixtureByName,
  replayGoldenDayWithService,
  type SessionMetricsService,
} from './replay.js';

const createFakeSessionMetricsService = (): SessionMetricsService => ({
  async getForSymbolSession(symbol: string, sessionDate: string): Promise<unknown> {
    return {
      status: 'mocked',
      orWidth: 20,
      orToAtrRatio: 1.2,
      vwapSlopeClassification: 'trend_up',
      symbol,
      sessionDate,
    };
  },
});

describe('Golden Day fixtures and replay harness', () => {
  it('loads a Golden Day fixture by name', async () => {
    const fixture = await loadGoldenDayFixtureByName('ES_2025-01-15');
    expect(fixture.symbol).toBe('ES');
    expect(fixture.bars1m.length).toBeGreaterThan(0);
  });

  it('replays a Golden Day through a fake SessionMetrics service', async () => {
    const fixture = await loadGoldenDayFixtureByName('ES_2025-01-15');
    const result = await replayGoldenDayWithService(fixture, createFakeSessionMetricsService());

    const metrics = result.recomputedSessionMetrics as Record<string, unknown>;
    expect(metrics.status).toBe('mocked');
    expect(metrics.orWidth).toBe(20);
    expect(metrics.orToAtrRatio).toBe(1.2);
    expect(metrics.vwapSlopeClassification).toBe('trend_up');
  });
});
