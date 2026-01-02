import { describe, it, expect } from 'vitest';
import {
  createOrrV3Engine,
  DEFAULT_ORR_V3_CONFIG,
  type OrrV3Input,
  type OrrSessionMetricsSummary,
  type OrrSessionFlagsSummary,
  type ORRSignalType,
} from './orr-v3';

function makeMetrics(overrides: Partial<OrrSessionMetricsSummary> = {}): OrrSessionMetricsSummary {
  return {
    status: 'OK',
    orWidth: 10,
    orToAtrRatio: 1.2,
    vwapSlopeClassification: 'UP',
    ...overrides,
  };
}

function makeFlags(overrides: Partial<OrrSessionFlagsSummary> = {}): OrrSessionFlagsSummary {
  return { hasNewsFlag: false, ...overrides };
}

function makeInput(overrides: Partial<OrrV3Input> = {}): OrrV3Input {
  return {
    symbol: 'ES',
    sessionDateUtc: '2025-01-15',
    metrics: makeMetrics(),
    flags: makeFlags(),
    ...overrides,
  };
}

describe('ORR v3 engine', () => {
  const engine = createOrrV3Engine(DEFAULT_ORR_V3_CONFIG);

  it('NO_TRADE on news sessions', () => {
    const signal = engine(makeInput({ flags: makeFlags({ hasNewsFlag: true }) }));
    expect(signal.type).toBe<ORRSignalType>('NO_TRADE');
    expect(signal.reason).toBe('NEWS_SESSION');
  });

  it('NO_TRADE when metrics missing or status not OK', () => {
    const missing = engine(makeInput({ metrics: null }));
    const bad = engine(makeInput({ metrics: makeMetrics({ status: 'ERROR' }) }));
    expect(missing.reason).toBe('NO_SESSION_METRICS');
    expect(bad.reason).toBe('METRICS_STATUS_ERROR');
  });

  it('NO_TRADE when OR/ATR missing or out of range', () => {
    const missing = engine(makeInput({ metrics: makeMetrics({ orWidth: null }) }));
    const low = engine(makeInput({ metrics: makeMetrics({ orToAtrRatio: 0.1 }) }));
    const high = engine(makeInput({ metrics: makeMetrics({ orToAtrRatio: 10 }) }));
    expect(missing.reason).toBe('MISSING_OR_OR_ATR');
    expect(low.reason).toBe('OR_ATR_OUT_OF_RANGE');
    expect(high.reason).toBe('OR_ATR_OUT_OF_RANGE');
  });

  it('LONG_SETUP / SHORT_SETUP when VWAP slope UP/DOWN', () => {
    const longSignal = engine(makeInput({ metrics: makeMetrics({ vwapSlopeClassification: 'UP' }) }));
    const shortSignal = engine(makeInput({ metrics: makeMetrics({ vwapSlopeClassification: 'DOWN' }) }));
    expect(longSignal.type).toBe('LONG_SETUP');
    expect(longSignal.reason).toBe('CLEAN_OR_UPTREND');
    expect(shortSignal.type).toBe('SHORT_SETUP');
    expect(shortSignal.reason).toBe('CLEAN_OR_DOWNTREND');
  });

  it('NO_TRADE when slope FLAT/UNKNOWN', () => {
    const flat = engine(makeInput({ metrics: makeMetrics({ vwapSlopeClassification: 'FLAT' }) }));
    const unknown = engine(makeInput({ metrics: makeMetrics({ vwapSlopeClassification: 'UNKNOWN' }) }));
    expect(flat.reason).toBe('NO_CLEAR_EDGE');
    expect(unknown.reason).toBe('NO_CLEAR_EDGE');
  });
});
