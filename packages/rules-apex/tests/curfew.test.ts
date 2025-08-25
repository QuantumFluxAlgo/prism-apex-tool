import { isAfterFlat } from '../src/curfew';

describe('curfew', () => {
  const flatByUtc = '20:59';

  it('returns false before cutoff', () => {
    const now = new Date('2020-01-01T20:58:00Z');
    expect(isAfterFlat(now, flatByUtc)).toBe(false);
  });

  it('returns true at cutoff', () => {
    const now = new Date('2020-01-01T20:59:00Z');
    expect(isAfterFlat(now, flatByUtc)).toBe(true);
  });
});
