import { describe, it, expect } from 'vitest';
import { parseTradingViewPayload } from '../parser';

const now = '2025-08-17T14:00:00.000Z';

describe('TradingView parser', () => {
  it('parses well-formed JSON payloads', () => {
    const p = {
      alert_id: 'abc123',
      symbol: 'ES',
      side: 'BUY',
      price: 5000.25,
      reason: 'VWAP touch',
      ts: '2025-08-17T13:59:00.000Z'
    };
    const r = parseTradingViewPayload(p, now);
    expect(r.alert.symbol).toBe('ES');
    expect(r.alert.side).toBe('BUY');
    expect(r.alert.price).toBe(5000.25);
    expect(r.human.text).toMatch(/VWAP touch/);
    expect(r.candidate).toBeTruthy();
  });

  it('extracts from free text when keys are missing', () => {
    const txt = { message: 'Alert: ES LONG possible at 4998.5 [reason: Opening Range break]' };
    const r = parseTradingViewPayload(txt, now);
    expect(r.alert.symbol).toBe('ES');
    expect(r.alert.side).toBe('BUY');
    expect(r.alert.price).toBeCloseTo(4998.5, 3);
    expect(r.human.text).toMatch(/Opening Range/);
  });

  it('produces stable id and has ISO timestamp fallback', () => {
    const r1 = parseTradingViewPayload({ message: 'ES BUY 5000' }, now);
    const r2 = parseTradingViewPayload({ message: 'ES BUY 5000' }, now);
    expect(r1.alert.id).toBe(r2.alert.id);
    expect(r1.alert.ts).toBe(now);
  });

  it('ignores unknown symbols and sides safely', () => {
    const r = parseTradingViewPayload({ message: 'ABC go up 123.4' }, now);
    expect(r.alert.symbol).toBeUndefined();
    expect(r.alert.side).toBeUndefined();
    expect(r.candidate).toBeUndefined();
  });
});
