import { describe, it, expect } from 'vitest';
import { TicketSchema } from '@prism-apex/app-api/schemas/ticket.js';

describe('ticket schema', () => {
  it('accepts APX-DDB-01 strategy', () => {
    const result = TicketSchema.parse({
      symbol: 'ESZ4',
      side: 'BUY',
      entry: 100,
      stop: 99,
      target: 102,
      qty: 1,
      accountId: 'A1',
      timestampUtc: '2024-01-01T10:00:00Z',
      meta: {
        strategy: 'APX-DDB-01',
        rr: 2,
        guardrails: [],
      },
      accepted: true,
    });

    expect(result.meta.strategy).toBe('APX-DDB-01');
  });
});
