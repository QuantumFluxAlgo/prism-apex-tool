import { describe, it, expect } from 'vitest';
import type { Bar } from '../../shared/src/types';
import { openSessionBreakout } from '../openSessionBreakout';

function iso(date: string, t: string) { return `${date}T${t}Z`; }

function genBars(date: string, symbol: 'ES'|'NQ'|'MES'|'MNQ'): Bar[] {
  // 1m bars from 13:30 to 14:10, then a breakout bar at 14:15
  const out: Bar[] = [];
  let price = 5000;
  for (let m = 30; m <= 70; m++) {
    const ts = iso(date, `${String(13 + Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00.000`);
    price += (m % 5 === 0 ? 0.5 : -0.25);
    const o = price - 0.25, h = price + 0.5, l = price - 0.5, c = price;
    out.push({ ts, symbol, interval: '1m', o, h, l, c, v: 100 });
  }
  // Add a clear upside breakout after 14:00 (OR=13:30-14:00)
  out.push({
    ts: iso(date, '14:15:00.000'),
    symbol, interval: '1m',
    o: price + 0.25, h: price + 6, l: price, c: price + 5.5, v: 200
  });
  return out;
}

describe('openSessionBreakout', () => {
  it('returns null before OR completes', () => {
    const bars = genBars('2025-08-17', 'ES');
    const cfg = {
      symbol: 'ES' as const,
      contract: 'ESU5',
      rthStart: '13:30' as const,
      orMinutes: 30,
      tickSize: 0.25,
      tickBuffer: 0.25,
      maxTradesPerDay: 1,
      tradesTakenToday: 0,
      targetMultiples: [1, 2],
      qty: 1,
    };
    const now = new Date('2025-08-17T13:45:00.000Z');
    expect(openSessionBreakout(bars, now, cfg)).toBeNull();
  });

  it('produces a BUY ticket on upside breakout after OR window', () => {
    const bars = genBars('2025-08-17', 'ES');
    const cfg = {
      symbol: 'ES' as const,
      contract: 'ESU5',
      rthStart: '13:30' as const,
      orMinutes: 30,
      tickSize: 0.25,
      tickBuffer: 0.25,
      maxTradesPerDay: 2,
      tradesTakenToday: 0,
      targetMultiples: [1, 2],
      qty: 1,
    };
    const now = new Date('2025-08-17T14:16:00.000Z');
    const t = openSessionBreakout(bars, now, cfg);
    expect(t).not.toBeNull();
    expect(t!.side).toBe('BUY');
    expect(t!.order.stop).toBeLessThan(t!.order.entry);
    // Ensure includes 1R and <= 5R
    expect(t!.risk.rMultipleByTarget.every((r) => r > 0 && r <= 5)).toBe(true);
  });

  it('respects trade caps (returns null if already reached)', () => {
    const bars = genBars('2025-08-17', 'ES');
    const cfg = {
      symbol: 'ES' as const,
      contract: 'ESU5',
      rthStart: '13:30' as const,
      orMinutes: 30,
      tickSize: 0.25,
      tickBuffer: 0.25,
      maxTradesPerDay: 1,
      tradesTakenToday: 1,
      targetMultiples: [1],
      qty: 1,
    };
    const now = new Date('2025-08-17T14:16:00.000Z');
    expect(openSessionBreakout(bars, now, cfg)).toBeNull();
  });
});

