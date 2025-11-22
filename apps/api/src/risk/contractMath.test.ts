import { describe, expect, it } from 'vitest';
import {
  ContractMathError,
  getInstrumentSpec,
  ticksToDollars,
  dollarsToContracts,
  computeTradeRisk,
  computePnlDollars,
} from './contractMath.js';

describe('contractMath', () => {
  it('returns known instrument specs', () => {
    const es = getInstrumentSpec('es');
    expect(es.symbol).toBe('ES');
    expect(es.tickSize).toBe(0.25);
    expect(es.dollarsPerTick).toBe(12.5);

    const nq = getInstrumentSpec('NQ');
    expect(nq.symbol).toBe('NQ');
  });

  it('converts ticks to dollars by instrument', () => {
    expect(ticksToDollars('ES', 4)).toBeCloseTo(50);
    expect(ticksToDollars('NQ', 4)).toBeCloseTo(20);
  });

  it('computes contracts from dollars and stop distance', () => {
    // 10 ticks risk = 125 dollars per contract
    const contracts = dollarsToContracts('ES', 500, 10);
    expect(contracts).toBe(4);
  });

  it('returns zero contracts if risk is insufficient', () => {
    const contracts = dollarsToContracts('ES', 20, 10);
    expect(contracts).toBe(0);
  });

  it('computes per-trade risk', () => {
    const risk = computeTradeRisk('ES', 3, 5);
    expect(risk).toBeCloseTo(3 * ticksToDollars('ES', 5));
  });

  it('computes pnl dollars with correct sign', () => {
    const win = computePnlDollars('ES', 5000, 5001, 2);
    const lose = computePnlDollars('ES', 5000, 4999, 2);
    expect(win).toBeGreaterThan(0);
    expect(lose).toBeLessThan(0);
  });

  it('throws on invalid inputs', () => {
    expect(() => getInstrumentSpec('UNK')).toThrow(ContractMathError);
    expect(() => ticksToDollars('ES', Number.NaN)).toThrow(ContractMathError);
    expect(() => dollarsToContracts('ES', -1, 5)).toThrow(ContractMathError);
    expect(() => dollarsToContracts('ES', 100, -1)).toThrow(ContractMathError);
    expect(() => computeTradeRisk('ES', -1, 5)).toThrow(ContractMathError);
    expect(() => computePnlDollars('ES', Number.NaN, 1, 1)).toThrow(ContractMathError);
  });
});
