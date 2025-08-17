import { describe, expect, it } from 'vitest';
import { isWithinRTH_GMT, todayCutoff2059GMT, toGMT } from '../time.js';

describe('time utilities', () => {
  it('converts input to GMT Date', () => {
    const iso = '2024-05-13T10:00:00.000Z';
    const fromString = toGMT(iso);
    expect(fromString.toISOString()).toBe(iso);
    const fromDate = toGMT(new Date(iso));
    expect(fromDate.toISOString()).toBe(iso);
    expect(fromDate).not.toBe(fromString); // new instance
  });

  it('throws on invalid date', () => {
    expect(() => toGMT('bad')).toThrow('Invalid date input');
  });

  it('detects RTH correctly', () => {
    expect(
      isWithinRTH_GMT(toGMT('2024-05-13T14:00:00Z'), 'ES'),
    ).toBe(true);
    expect(
      isWithinRTH_GMT(toGMT('2024-05-13T13:29:00Z'), 'ES'),
    ).toBe(false);
    expect(
      isWithinRTH_GMT(toGMT('2024-05-13T21:00:00Z'), 'ES'),
    ).toBe(false);
  });

  it('provides daily cutoff at 20:59 GMT', () => {
    const cutoff = todayCutoff2059GMT(toGMT('2024-05-13T10:00:00Z'));
    expect(cutoff.toISOString()).toBe('2024-05-13T20:59:00.000Z');
  });

  it('is stable across DST boundaries', () => {
    const spring = toGMT('2024-03-10T15:00:00Z');
    const fall = toGMT('2024-11-03T15:00:00Z');
    expect(isWithinRTH_GMT(spring, 'ES')).toBe(true);
    expect(isWithinRTH_GMT(fall, 'ES')).toBe(true);
  });
});
