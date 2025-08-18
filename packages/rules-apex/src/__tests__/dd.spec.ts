import { describe, it, expect } from 'vitest';
import { computeTrailingDDLine } from '../computeTrailingDDLine';
import { projectStopBreach } from '../projectStopBreach';
import type { Ticket, AccountState } from '../../../shared/src/types';

const baseState: AccountState = {
  netLiq: 52000,
  cash: 52000,
  margin: 0,
  dayPnlRealized: 0,
  dayPnlUnrealized: 0,
};

function ticket(perTradeUsd: number): Ticket {
  return {
    id: 't1',
    symbol: 'ES',
    contract: 'ESU5',
    side: 'BUY',
    qty: 1,
    order: {
      type: 'LIMIT',
      entry: 5000,
      stop: 4995,
      targets: [5005],
      tif: 'DAY',
      oco: true,
    },
    risk: { perTradeUsd, rMultipleByTarget: [1] },
    apex: {
      stopRequired: true,
      rrLeq5: true,
      ddHeadroom: true,
      halfSize: true,
      eodReady: true,
      consistency30: 'OK',
    },
  };
}

describe('computeTrailingDDLine', () => {
  it('computes ddLine = netLiqHigh - ddAmount', () => {
    expect(computeTrailingDDLine(52000, 2500)).toBe(49500);
  });

  it('throws on invalid inputs', () => {
    expect(() => computeTrailingDDLine(NaN as any, 2500)).toThrow();
    expect(() => computeTrailingDDLine(52000, -1)).toThrow();
  });

  it('clamps if ddAmount > netLiqHigh', () => {
    expect(computeTrailingDDLine(1000, 5000)).toBeCloseTo(0.01);
  });
});

describe('projectStopBreach', () => {
  it('OK when projected netLiq at stop remains above ddLine', () => {
    const ddLine = computeTrailingDDLine(52000, 3000); // 49000
    const res = projectStopBreach(ticket(500), baseState, ddLine); // 52000-500=51500 > 49000
    expect(res.ok).toBe(true);
  });

  it('FAIL when projected netLiq at stop would breach ddLine', () => {
    const ddLine = computeTrailingDDLine(52000, 5000); // 47000
    const res = projectStopBreach(ticket(6000), baseState, ddLine); // 52000-6000=46000 < 47000
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/breaches DD line/i);
  });

  it('FAIL conservatively if perTradeUsd missing/invalid', () => {
    const ddLine = computeTrailingDDLine(52000, 3000);
    const bad: Ticket = ticket(NaN as any);
    (bad.risk as any).perTradeUsd = NaN;
    const res = projectStopBreach(bad, baseState, ddLine);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/invalid per-trade risk/i);
  });

  it('FAIL on invalid account state or ddLine', () => {
    const ddLine = computeTrailingDDLine(52000, 3000);
    const res1 = projectStopBreach(ticket(500), { ...baseState, netLiq: NaN as any }, ddLine);
    expect(res1.ok).toBe(false);

    const res2 = projectStopBreach(ticket(500), baseState, NaN as any);
    expect(res2.ok).toBe(false);
  });
});
