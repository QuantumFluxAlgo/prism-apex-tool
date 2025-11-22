import { describe, it, expect } from 'vitest';
import {
  createOsbEngine,
  type OsbEngine,
  type SessionFlagsSummary,
  type SessionMetricsSummary,
} from './osb';

function makeMetrics(overrides: Partial<SessionMetricsSummary> = {}): SessionMetricsSummary {
  return {
    orWidth: 10,
    orToAtrRatio: 1.2,
    vwapSlopeClassification: 'UP',
    ...overrides,
  };
}

function makeFlags(overrides: Partial<SessionFlagsSummary> = {}): SessionFlagsSummary {
  return {
    flags: [],
    hasNewsFlag: false,
    ...overrides,
  };
}

describe('OSB engine – guardrails', () => {
  it('returns NO_TRADE when hasNewsFlag', () => {
    const engine: OsbEngine = createOsbEngine();
    expect(
      engine({
        metrics: makeMetrics(),
        flags: makeFlags({ hasNewsFlag: true, flags: ['NEWS'] }),
      }),
    ).toMatchObject({ type: 'NO_TRADE', reason: 'NEWS_GUARDRAIL' });
  });

  it('returns NO_TRADE when metrics missing', () => {
    const engine: OsbEngine = createOsbEngine();
    expect(engine({ metrics: null, flags: makeFlags() })).toMatchObject({
      type: 'NO_TRADE',
      reason: 'MISSING_METRICS',
    });
  });

  it('returns NO_TRADE when OR:ATR outside band', () => {
    const engine: OsbEngine = createOsbEngine({ minOrToAtr: 0.75, maxOrToAtr: 2 });
    expect(
      engine({ metrics: makeMetrics({ orToAtrRatio: 0.5 }), flags: makeFlags() }),
    ).toMatchObject({ type: 'NO_TRADE', reason: 'OR_ATR_OUT_OF_RANGE' });
    expect(
      engine({ metrics: makeMetrics({ orToAtrRatio: 3 }), flags: makeFlags() }),
    ).toMatchObject({ type: 'NO_TRADE', reason: 'OR_ATR_OUT_OF_RANGE' });
  });
});

describe('OSB engine – directional behaviour', () => {
  const engine: OsbEngine = createOsbEngine();

  it('emits LONG_SETUP for UP slope', () => {
    expect(
      engine({ metrics: makeMetrics({ vwapSlopeClassification: 'UP' }), flags: makeFlags() }),
    ).toMatchObject({ type: 'LONG_SETUP', reason: 'VWAP_UP' });
  });

  it('emits SHORT_SETUP for DOWN slope', () => {
    expect(
      engine({ metrics: makeMetrics({ vwapSlopeClassification: 'DOWN' }), flags: makeFlags() }),
    ).toMatchObject({ type: 'SHORT_SETUP', reason: 'VWAP_DOWN' });
  });

  it('emits NO_TRADE for FLAT slope', () => {
    expect(
      engine({ metrics: makeMetrics({ vwapSlopeClassification: 'FLAT' }), flags: makeFlags() }),
    ).toMatchObject({ type: 'NO_TRADE', reason: 'VWAP_FLAT' });
  });
});
