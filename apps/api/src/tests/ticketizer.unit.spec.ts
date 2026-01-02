import { describe, it, expect } from 'vitest';
import { guardSuggestion, Suggestion } from '@prism-apex/app-api/jobs/ticketizer.js';

const base: Suggestion = {
  symbol: 'ES',
  contract: 'ESZ4',
  side: 'BUY',
  entry: 100,
  stop: 99,
  target: 102,
  qty: 2,
  timestampUtc: '2024-01-01T10:00:00Z',
  meta: { strategy: 'VWAP_FT' },
};

const ctx = {
  accountId: 'A1',
  phase: 'funded' as const,
  maxContracts: 4,
  bufferCleared: true,
  recentSizes: [] as number[],
  flatByUtc: '20:59:00',
};

describe('ticketizer guards', () => {
  it('funded + missing stop -> rejected', () => {
    const s = { ...base, stop: undefined };
    const t = guardSuggestion(s, ctx);
    expect(t.accepted).toBe(false);
    expect(t.reasons).toContain('stop-required');
  });

  it('rr < 1.5 -> rejected', () => {
    const s = { ...base, target: 100.6 };
    const t = guardSuggestion(s, ctx);
    expect(t.accepted).toBe(false);
    expect(t.reasons).toContain('rr-too-low');
  });

  it('bufferCleared=false -> qty halved', () => {
    const s = { ...base, qty: 2 };
    const t = guardSuggestion(s, { ...ctx, bufferCleared: false });
    expect(t.accepted).toBe(true);
    expect(t.qty).toBe(1);
  });

  it('anti-windfall rejects big jumps', () => {
    const s = { ...base, qty: 5 };
    const t = guardSuggestion(s, { ...ctx, recentSizes: [1] });
    expect(t.accepted).toBe(false);
    expect(t.reasons).toContain('windfall');
    expect(t.meta.guardrails).toContain('anti-windfall');
  });

  it('pre-close suppression', () => {
    const s = { ...base, timestampUtc: '2024-01-01T20:55:30Z' };
    const t = guardSuggestion(s, ctx);
    expect(t.accepted).toBe(false);
    expect(t.reasons).toContain('preclose-suppression');
  });
});
