import { describe, expect, it } from 'vitest';
import type { Ticket } from '../../../shared/src/types.js';
// eslint-disable-next-line import/no-unresolved
import { checkStopRequired } from '../checkStopRequired.js';

function baseTicket(partial?: Partial<Ticket>): Ticket {
  const base: Ticket = {
    id: 't1',
    symbol: 'ES',
    contract: 'ESU5',
    side: 'BUY',
    qty: 1,
    order: {
      type: 'LIMIT',
      entry: 5000,
      stop: 4990,
      targets: [5010] as readonly number[],
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

  return {
    ...base,
    ...partial,
    order: (partial?.order as Ticket['order'] | undefined) ?? base.order,
    risk: partial?.risk ?? base.risk,
    apex: partial?.apex ?? base.apex,
  } as Ticket;
}

describe('checkStopRequired', () => {
  it('OK when stop is present and not equal to entry', () => {
    const t = baseTicket();
    const res = checkStopRequired(t);
    expect(res.ok).toBe(true);
  });

  it('FAIL when stop is missing', () => {
    const t = baseTicket({
      order: {
        type: 'LIMIT',
        entry: 5000,
        // @ts-expect-error testing missing stop
        targets: [5010],
        tif: 'DAY',
        oco: true,
      } as any,
    });
    const res = checkStopRequired(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Stop-loss is required/i);
  });

  it('FAIL when stop equals entry', () => {
    const t = baseTicket({
      order: {
        type: 'LIMIT',
        entry: 5000,
        stop: 5000,
        targets: [5010],
        tif: 'DAY',
        oco: true,
      } as any,
    });
    const res = checkStopRequired(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/cannot equal entry/i);
  });

  it('FAIL when entry is invalid', () => {
    const t = baseTicket({
      order: {
        type: 'LIMIT',
        entry: Number.NaN,
        stop: 4990,
        targets: [5010],
        tif: 'DAY',
        oco: true,
      } as any,
    });
    const res = checkStopRequired(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Invalid entry/i);
  });

  it('FAIL when stop <= 0', () => {
    const t = baseTicket({
      order: {
        type: 'LIMIT',
        entry: 5000,
        stop: 0,
        targets: [5010],
        tif: 'DAY',
        oco: true,
      } as any,
    });
    const res = checkStopRequired(t);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/must be > 0/i);
  });
});
