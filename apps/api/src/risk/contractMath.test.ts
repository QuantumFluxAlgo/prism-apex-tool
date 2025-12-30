import { describe, expect, it } from 'vitest';
import {
  ContractMathError,
  getInstrumentSpec,
  ticksToDollars,
  dollarsToContracts,
  computeTradeRisk,
  computePnlDollars,
  priceDiffToTicks,
} from './contractMath.js';

describe('contractMath', () => {
  it('normalizes symbols and exposes shared specs', () => {
    const es = getInstrumentSpec('es');
    expect(es.symbol).toBe('ES');
    expect(es.tickSize).toBe(0.25);
    expect(es.dollarsPerTick).toBe(12.5);

    const alias = getInstrumentSpec('ES=F');
    expect(alias.symbol).toBe('ES');

    const nq = getInstrumentSpec('NQ');
    expect(nq.tickSize).toBe(0.25);
  });

  it('converts ticks to dollars across instruments', () => {
    expect(ticksToDollars('ES', 4)).toBeCloseTo(50);
    expect(ticksToDollars('NQ', 4)).toBeCloseTo(20);
    expect(ticksToDollars('CL', 5)).toBeCloseTo(50);
  });

  it('computes contracts from dollars and stop distance', () => {
    const contracts = dollarsToContracts('ES', 500, 10); // 10 ticks = $125 risk/contract
    expect(contracts).toBe(4);
  });

  it('returns zero contracts if risk is insufficient', () => {
    const contracts = dollarsToContracts('ES', 20, 10);
    expect(contracts).toBe(0);
  });

  it('computes per-trade risk for equity and energy futures', () => {
    const esRisk = computeTradeRisk('ES', 3, 5);
    expect(esRisk).toBeCloseTo(3 * ticksToDollars('ES', 5));
    const clRisk = computeTradeRisk('CL', 2, 15);
    expect(clRisk).toBeCloseTo(2 * ticksToDollars('CL', 15));
  });

  it('computes pnl dollars with correct sign', () => {
    const win = computePnlDollars('ES', 5000, 5001, 2);
    const lose = computePnlDollars('ES', 5000, 4999, 2);
    expect(win).toBeGreaterThan(0);
    expect(lose).toBeLessThan(0);
  });

  it('derives ticks from price differences deterministically', () => {
    expect(priceDiffToTicks('ES', 5000, 5001)).toBeCloseTo(4);
    expect(priceDiffToTicks('NQ', 15000, 14999)).toBeCloseTo(-4);
  });

  it('throws on invalid inputs', () => {
    expect(() => getInstrumentSpec('UNK')).toThrow(ContractMathError);
    expect(() => ticksToDollars('ES', Number.NaN)).toThrow(ContractMathError);
    expect(() => dollarsToContracts('ES', -1, 5)).toThrow(ContractMathError);
    expect(() => dollarsToContracts('ES', 100, -1)).toThrow(ContractMathError);
    expect(() => computeTradeRisk('ES', -1, 5)).toThrow(ContractMathError);
    expect(() => computePnlDollars('ES', Number.NaN, 1, 1)).toThrow(ContractMathError);
    expect(() => priceDiffToTicks('ES', Number.NaN, 1)).toThrow(ContractMathError);
  });
});
