import { describe, it, expect } from 'vitest';
// eslint-disable-next-line import/no-unresolved
import { enforceHalfSizeUntilBuffer } from '../enforceHalfSizeUntilBuffer.js';
// eslint-disable-next-line import/no-unresolved
import { checkConsistency30 } from '../checkConsistency30.js';
// eslint-disable-next-line import/no-unresolved
import { checkEODCutoff } from '../checkEODCutoff.js';

// ---- enforceHalfSizeUntilBuffer ----
describe('enforceHalfSizeUntilBuffer', () => {
  it('fails on invalid qty or maxContracts', () => {
    expect(enforceHalfSizeUntilBuffer(0, 4, false).ok).toBe(false);
    expect(enforceHalfSizeUntilBuffer(1.5 as any, 4, false).ok).toBe(false);
    expect(enforceHalfSizeUntilBuffer(1, 0, false).ok).toBe(false);
  });

  it('allows up to floor(max/2) before buffer achieved', () => {
    // max=5 => half=floor(5/2)=2
    expect(enforceHalfSizeUntilBuffer(1, 5, false).ok).toBe(true);
    expect(enforceHalfSizeUntilBuffer(2, 5, false).ok).toBe(true);
    const res = enforceHalfSizeUntilBuffer(3, 5, false);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/half-size/i);
  });

  it('allows full size after buffer achieved but blocks above max', () => {
    expect(enforceHalfSizeUntilBuffer(5, 5, true).ok).toBe(true);
    expect(enforceHalfSizeUntilBuffer(6, 5, true).ok).toBe(false);
  });
});

// ---- checkConsistency30 ----
describe('checkConsistency30', () => {
  it('OK when total <= 0 (no profits yet)', () => {
    expect(checkConsistency30(0, 0)).toBe('OK');
    expect(checkConsistency30(-100, -50)).toBe('OK');
  });

  it('OK below 25% share', () => {
    // today=100, period=500 => share=100/600 = 16.6%
    expect(checkConsistency30(100, 500)).toBe('OK');
  });

  it('WARN at >=25%', () => {
    // today=150, period=450 => share=25%
    expect(checkConsistency30(150, 450)).toBe('WARN');
  });

  it('FAIL at >=30%', () => {
    // today=300, period=700 => 30%
    expect(checkConsistency30(300, 700)).toBe('FAIL');
    // even if period small
    expect(checkConsistency30(30, 70)).toBe('FAIL');
  });

  it('ignores negative today/period for ratio (uses positives only)', () => {
    // today = 100, period = -100 => total = 100 => 100/100 = 100% -> FAIL
    expect(checkConsistency30(100, -100)).toBe('FAIL');
    // today = -50, period = 500 => share = 0/500 = 0 -> OK
    expect(checkConsistency30(-50, 500)).toBe('OK');
  });

  it('handles non-finite inputs conservatively', () => {
    expect(checkConsistency30(Number.NaN, 100)).toBe('OK');
    expect(checkConsistency30(100, Number.NaN)).toBe('FAIL');
  });
});

// ---- checkEODCutoff ----
describe('checkEODCutoff', () => {
  function d(iso: string) { return new Date(iso); }

  it('OK well before cutoff', () => {
    // 20:50:00Z is OK (more than 5 minutes before 20:59)
    expect(checkEODCutoff(d('2025-08-17T20:50:00.000Z'))).toBe('OK');
  });

  it('BLOCK_NEW within last 5 minutes before 20:59', () => {
    // 20:55:00Z is within T-5 window
    expect(checkEODCutoff(d('2025-08-17T20:55:00.000Z'))).toBe('BLOCK_NEW');
  });

  it('BLOCK_NEW at/after cutoff', () => {
    expect(checkEODCutoff(d('2025-08-17T20:59:00.000Z'))).toBe('BLOCK_NEW');
    expect(checkEODCutoff(d('2025-08-17T21:05:00.000Z'))).toBe('BLOCK_NEW');
  });
});
