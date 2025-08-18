import { describe, it, expect } from 'vitest';
import type { Ticket } from '../../../shared/src/types.js';
// eslint-disable-next-line import/no-unresolved
import { checkRRMax5 } from '../checkRRMax5.js';

function makeTicket(p: Partial<Ticket> = {}): Ticket {
  const base: Ticket = {
    id: 't1',
    symbol: 'ES',
    contract: 'ESU5',
    side: 'BUY',
    qty: 1,
    order: {
      type: 'LIMIT',
      entry: 5000,
      stop: 4995, // risk = 5 for BUY
      targets: [5005] as readonly number[], // reward = 5 -> 1R
      tif: 'DAY',
      oco: true,
    },
    risk: { perTradeUsd: 100, rMultipleByTarget: [1] as readonly number[] },
    apex: {
      stopRequired: true,
      rrLeq5: true,
      ddHeadroom: true,
      halfSize: true,
      eodReady: true,
      consistency30: 'OK',
    },
  };
  // Deep override where needed
  const merged: any = { ...base, ...p, order: { ...base.order, ...(p as any).order } };
  return merged as Ticket;
}

describe('checkRRMax5', () => {
  it('OK when all targets are <= 5.0R (BUY)', () => {
    // risk = 5; targets at +5 (1R), +25 (5R)
    const t = makeTicket({ order: { targets: [5005, 5025] } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(true);
  });

  it('OK exactly at 5.0R boundary', () => {
    const t = makeTicket({ order: { stop: 4990, targets: [5050] } as any }); // risk=10, reward=50 => 5R
    const res = checkRRMax5(t);
    expect(res.ok).toBe(true);
  });

  it('FAIL when any target exceeds 5.0R (BUY)', () => {
    // risk=5; reward=26 => 5.2R
    const t = makeTicket({ order: { targets: [5026] } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/exceeds 5:1/i);
  });

  it('SELL symmetry: OK when <= 5.0R; FAIL when > 5.0R', () => {
    // SELL: risk = stop - entry; reward = entry - target
    const sellOk = makeTicket({
      side: 'SELL',
      order: { entry: 5000, stop: 5005, targets: [4990] } as any, // risk=5, reward=10 => 2R
    });
    expect(checkRRMax5(sellOk).ok).toBe(true);

    const sellFail = makeTicket({
      side: 'SELL',
      order: { entry: 5000, stop: 5005, targets: [4974] } as any, // risk=5, reward=26 => 5.2R
    });
    const res = checkRRMax5(sellFail);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/exceeds 5:1/i);
  });

  it('FAIL if targets array missing/empty/invalid', () => {
    const t1 = makeTicket({ order: { targets: [] } as any });
    expect(checkRRMax5(t1).ok).toBe(false);

    const t2 = makeTicket({ order: { targets: [Number.NaN] } as any });
    expect(checkRRMax5(t2).ok).toBe(false);
  });

  it('FAIL if risk <= 0 due to bad entry/stop relationship', () => {
    // BUY with stop above entry -> negative risk
    const t = makeTicket({ order: { entry: 5000, stop: 5001 } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Risk must be > 0/i);
  });

  it('FAIL if a target is not beyond entry in the favorable direction', () => {
    // BUY but target below entry => reward <= 0
    const t = makeTicket({ order: { entry: 5000, stop: 4995, targets: [4999] } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/favorable direction/i);
  });

  it('FAIL if side is invalid', () => {
    const t = makeTicket({ side: 'HOLD' as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Invalid side/i);
  });

  it('FAIL if entry is invalid', () => {
    const t = makeTicket({ order: { entry: Number.NaN } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Invalid entry price/i);
  });

  it('FAIL if stop is invalid', () => {
    const t = makeTicket({ order: { stop: Number.NaN } as any });
    const res = checkRRMax5(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Invalid stop price/i);
  });
});
