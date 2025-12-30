import { describe, expect, it } from 'vitest';
import {
  getContractSpec,
  ticksToDollars,
  priceDiffToTicks,
  loadContractsSpec,
} from './contracts.js';

describe('contracts spec loader', () => {
  it('normalizes symbols and resolves canonical specs', () => {
    const es = getContractSpec('es');
    expect(es.symbol).toBe('ES');
    expect(es.tickSize).toBe(0.25);
    expect(es.tickValueUSD).toBe(12.5);
    expect(es.contractMultiplier).toBe(50);

    const esAlias = getContractSpec('ES=F');
    expect(esAlias.symbol).toBe('ES');

    const nq = getContractSpec('NQ');
    expect(nq.tickValueUSD).toBe(5);
  });

  it('throws clear error for unknown symbols', () => {
    expect(() => getContractSpec('UNK')).toThrow(/No contract spec/i);
  });

  it('converts ticks to dollars deterministically', () => {
    const cl = getContractSpec('CL');
    expect(ticksToDollars(cl, 5)).toBeCloseTo(50);
    const gc = getContractSpec('GC');
    expect(ticksToDollars(gc, -3)).toBeCloseTo(-30);
  });

  it('converts price differences to ticks', () => {
    const es = getContractSpec('ES');
    expect(priceDiffToTicks(es, 5000, 5001)).toBeCloseTo(4);
    const nq = getContractSpec('NQ');
    expect(priceDiffToTicks(nq, 15000, 14999)).toBeCloseTo(-4);
  });

  it('exposes the raw spec via loadContractsSpec', async () => {
    const file = await loadContractsSpec();
    expect(Array.isArray(file.symbols)).toBe(true);
    expect(file.symbols.length).toBeGreaterThan(0);
  });
});
