import { describe, it, expect } from 'vitest';
import { createVwapFtEngine, type VwapFtContext } from './vwap-ft';

describe('createVwapFtEngine', () => {
  const baseContext: VwapFtContext = {
    symbol: 'ES',
    sessionDateUtc: '2025-01-15',
    sessionMetrics: {
      orToAtrRatio: 1,
      vwapSlopeClassification: 'UP',
    },
    sessionFlags: {
      hasNewsFlag: false,
    },
  };

  it('blocks news sessions', () => {
    const engine = createVwapFtEngine();
    expect(
      engine({ ...baseContext, sessionFlags: { hasNewsFlag: true } }),
    ).toHaveLength(0);
  });

  it('requires metrics', () => {
    const engine = createVwapFtEngine();
    expect(engine({ ...baseContext, sessionMetrics: null })).toHaveLength(0);
  });

  it('enforces OR:ATR band', () => {
    const engine = createVwapFtEngine({ minOrToAtr: 0.8, maxOrToAtr: 2 });
    expect(
      engine({
        ...baseContext,
        sessionMetrics: { ...baseContext.sessionMetrics!, orToAtrRatio: 0.5 },
      }),
    ).toHaveLength(0);
    expect(
      engine({
        ...baseContext,
        sessionMetrics: { ...baseContext.sessionMetrics!, orToAtrRatio: 3 },
      }),
    ).toHaveLength(0);
  });

  it('emits LONG for UP slope', () => {
    const engine = createVwapFtEngine();
    const signals = engine(baseContext);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.direction).toBe('LONG');
  });

  it('emits SHORT for DOWN slope', () => {
    const engine = createVwapFtEngine();
    const signals = engine({
      ...baseContext,
      sessionMetrics: {
        ...baseContext.sessionMetrics!,
        vwapSlopeClassification: 'DOWN',
      },
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]?.direction).toBe('SHORT');
  });

  it('emits nothing for FLAT slope', () => {
    const engine = createVwapFtEngine();
    const signals = engine({
      ...baseContext,
      sessionMetrics: {
        ...baseContext.sessionMetrics!,
        vwapSlopeClassification: 'FLAT',
      },
    });
    expect(signals).toHaveLength(0);
  });
});
