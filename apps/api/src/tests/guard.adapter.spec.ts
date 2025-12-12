import { describe, it, expect } from 'vitest';
import { evaluateCandidate } from '@prism-apex/app-api/lib/guard.js';

describe('guard adapter', () => {
  it('allows valid candidate and surfaces guardrail codes', async () => {
    const decision = await evaluateCandidate({
      symbol: 'ES',
      contract: 'ESZ4',
      direction: 'BUY',
      entry: 100,
      stop: 99,
      target: 103,
      qty: 1,
      strategy: 'OSB',
      maxContracts: 4,
      bufferCleared: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.codes.length).toBeGreaterThan(0);
    expect(decision.reason).toBeNull();
    expect(decision.sizing?.contracts).toBeGreaterThan(0);
  });

  it('blocks candidates with low RR', async () => {
    const decision = await evaluateCandidate({
      symbol: 'ES',
      direction: 'BUY',
      entry: 100,
      stop: 99,
      target: 100.5,
      qty: 1,
      strategy: 'OSB',
      maxContracts: 2,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBeTruthy();
    expect(decision.codes).toContain('rr-too-low');
  });

  it('adds warnings when buffer has not cleared', async () => {
    const decision = await evaluateCandidate({
      symbol: 'ES',
      contract: 'ESZ4',
      direction: 'SELL',
      entry: 100,
      stop: 101,
      target: 97,
      qty: 4,
      strategy: 'OSB',
      bufferCleared: false,
      maxContracts: 4,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings).toContain('half-size-until-buffer');
    expect(decision.sizing?.contracts).toBeLessThan(4);
  });
});
