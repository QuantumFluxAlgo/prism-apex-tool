import { computeRR, guardRR } from '../src/guards/rr.js';
import { DEFAULTS } from '../src/config.js';

describe('rr guard', () => {
  it('accepts rr within range', () => {
    const rr = computeRR({ entry: 100, stop: 99, target: 103 });
    expect(guardRR(rr, DEFAULTS.MIN_RR, DEFAULTS.MAX_RR).ok).toBe(true);
  });

  it('rejects low rr', () => {
    const rr = computeRR({ entry: 100, stop: 99, target: 101 });
    expect(guardRR(rr, DEFAULTS.MIN_RR, DEFAULTS.MAX_RR).ok).toBe(false);
  });

  it('rejects high rr', () => {
    const rr = computeRR({ entry: 100, stop: 99, target: 110 });
    expect(guardRR(rr, DEFAULTS.MIN_RR, DEFAULTS.MAX_RR).ok).toBe(false);
  });
});
