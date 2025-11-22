import { describe, expect, test } from 'vitest';
import { evaluateHardStop, type HardStopInput } from './hardStop.js';

function makeInput(overrides: Partial<HardStopInput> = {}): HardStopInput {
  return {
    symbol: 'ES',
    entryPrice: 5000,
    stopPrice: 4997.5, // 10 ticks away with 0.25 tick size
    maxRiskDollarsPerTrade: 500,
    requestedContracts: undefined,
    ...overrides,
  };
}

describe('evaluateHardStop', () => {
  test('sizes contracts automatically when requestedContracts is absent', () => {
    const input = makeInput();
    const decision = evaluateHardStop(input);

    expect(decision.symbol).toBe('ES');
    expect(decision.entryPrice).toBe(input.entryPrice);
    expect(decision.stopPrice).toBe(input.stopPrice);
    expect(decision.riskDollars).toBeLessThanOrEqual(input.maxRiskDollarsPerTrade + 1e-6);

    if (!decision.approved) {
      throw new Error(`Expected approval, got rejection: ${decision.reason}`);
    }

    expect(decision.contracts).toBeGreaterThan(0);
    expect(decision.riskDollars).toBeGreaterThan(0);
  });

  test('accepts requestedContracts when risk fits the limit', () => {
    const input = makeInput({ requestedContracts: 1 });
    const decision = evaluateHardStop(input);

    expect(decision.approved).toBe(true);
    expect(decision.contracts).toBe(1);
    expect(decision.riskDollars).toBeGreaterThan(0);
  });

  test('rejects requestedContracts when risk exceeds limit', () => {
    const input = makeInput({ requestedContracts: 100, maxRiskDollarsPerTrade: 100 });
    const decision = evaluateHardStop(input);

    expect(decision.approved).toBe(false);
    expect(decision.contracts).toBe(0);
    expect(decision.reason).toMatch(/risk limit/i);
  });

  test('rejects zero-distance stops', () => {
    const input = makeInput({ stopPrice: 5000 });
    const decision = evaluateHardStop(input);

    expect(decision.approved).toBe(false);
    expect(decision.reason).toMatch(/invalid stop distance/i);
  });

  test('rejects when risk budget cannot cover minimum contracts', () => {
    const input = makeInput({ maxRiskDollarsPerTrade: 1 });
    const decision = evaluateHardStop(input);

    expect(decision.approved).toBe(false);
    expect(decision.contracts).toBe(0);
    expect(decision.reason).toMatch(/Unable to size even a single contract/i);
  });

  test('propagates ContractMathError as rejection reason', () => {
    const input = makeInput({ symbol: 'UNKNOWN' });
    const decision = evaluateHardStop(input);

    expect(decision.approved).toBe(false);
    expect(decision.reason).toBeDefined();
  });

  test('approved decisions always have positive contracts and risk', () => {
    const decision = evaluateHardStop(makeInput());

    if (decision.approved) {
      expect(decision.contracts).toBeGreaterThan(0);
      expect(decision.riskDollars).toBeGreaterThan(0);
    } else {
      expect(decision.contracts).toBe(0);
      expect(decision.riskDollars).toBe(0);
    }
  });
});
