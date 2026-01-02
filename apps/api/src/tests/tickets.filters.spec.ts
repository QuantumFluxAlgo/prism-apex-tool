import { describe, expect, it } from 'vitest';
import type { TicketRowDto } from '../routes/tickets.js';
import { applyQualityFilters } from '../routes/ticketQualityFilters.js';

function makeTicket(overrides: Partial<TicketRowDto> = {}): TicketRowDto {
  return {
    id: overrides.id ?? 't-1',
    symbol: overrides.symbol ?? 'ES',
    direction: (overrides.direction as 'LONG' | 'SHORT') ?? 'LONG',
    status: overrides.status ?? 'OPEN',
    rrMultiple: overrides.rrMultiple ?? 1.2,
    riskDollars: overrides.riskDollars ?? 250,
    rewardDollars: overrides.rewardDollars ?? 500,
    contracts: overrides.contracts ?? 2,
    pnl: overrides.pnl ?? 300,
    actualPnLDollars: overrides.actualPnLDollars ?? overrides.pnl ?? 300,
    actualRRMultiple: overrides.actualRRMultiple,
    sessionMetrics: null,
    sessionFlags: null,
    ...overrides,
  } as TicketRowDto;
}

describe('applyQualityFilters', () => {
  it('returns original tickets when no filters provided', () => {
    const tickets = [makeTicket(), makeTicket({ id: 't-2' })];
    const filtered = applyQualityFilters(tickets, {});
    expect(filtered).toEqual(tickets);
  });

  it('filters by minimum entry RR', () => {
    const tickets = [
      makeTicket({ id: 't-1', rrMultiple: 0.9 }),
      makeTicket({ id: 't-2', rrMultiple: 1.5 }),
    ];
    const filtered = applyQualityFilters(tickets, { minEntryRR: 1 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('t-2');
  });

  it('filters by risk dollars range', () => {
    const tickets = [
      makeTicket({ id: 'low', riskDollars: 100 }),
      makeTicket({ id: 'high', riskDollars: 600 }),
    ];
    const filtered = applyQualityFilters(tickets, { minRiskDollars: 200, maxRiskDollars: 700 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('high');
  });

  it('filters by actual PnL', () => {
    const tickets = [
      makeTicket({ id: 'win', actualPnLDollars: 300 }),
      makeTicket({ id: 'loss', actualPnLDollars: -200 }),
    ];
    const filtered = applyQualityFilters(tickets, { minActualPnLDollars: 0 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('win');
  });

  it('infers actual RR from PnL when missing', () => {
    const tickets = [
      makeTicket({ id: 'neg', riskDollars: 200, actualPnLDollars: -100, actualRRMultiple: null }),
      makeTicket({ id: 'pos', riskDollars: 200, actualPnLDollars: 150, actualRRMultiple: null }),
    ];
    const filtered = applyQualityFilters(tickets, { maxActualRR: 0 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('neg');
  });
});
