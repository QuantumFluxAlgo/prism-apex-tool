import { describe, expect, it } from 'vitest';
import {
  type Bar,
  isBar,
  type Ticket,
} from '../types.js';

describe('types', () => {
  it('constructs valid bar and guards', () => {
    const bar: Bar = {
      ts: '2024-05-13T13:30:00Z',
      symbol: 'ES',
      interval: '1m',
      o: 10,
      h: 12,
      l: 9,
      c: 11,
      v: 100,
    };
    expect(isBar(bar)).toBe(true);
    expect(
      isBar({ ...bar, symbol: 'BAD' }),
    ).toBe(false);
    expect(isBar(null)).toBe(false);
    expect(isBar(42)).toBe(false);
  });

  it('creates a ticket structure', () => {
    const ticket: Ticket = {
      id: 't1',
      symbol: 'ES',
      contract: 'ESU5',
      side: 'BUY',
      qty: 1,
      order: {
        type: 'LIMIT',
        entry: 10,
        stop: 9,
        targets: [11, 12],
        tif: 'DAY',
        oco: true,
      },
      risk: {
        perTradeUsd: 100,
        rMultipleByTarget: [1, 2],
      },
      apex: {
        stopRequired: true,
        rrLeq5: true,
        ddHeadroom: true,
        halfSize: false,
        eodReady: true,
        consistency30: 'OK',
      },
      notes: 'test',
    };
    expect(ticket.apex.eodReady).toBe(true);
  });
});
