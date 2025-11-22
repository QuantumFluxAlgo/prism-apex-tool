import { describe, expect, test } from 'vitest';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import { buildTicketsFromSignals, type TicketBuildContext } from './engineTickets.js';

function makeSignal(overrides: Partial<EngineSignal> = {}): EngineSignal {
  const base: EngineSignal = {
    id: 'sig-1',
    timestamp: '2025-01-15T14:30:00Z',
    direction: 'LONG',
    price: 5000,
    entryPrice: 5000,
    stopPrice: 4997.5, // 10 ticks with 0.25 size
    targetPrice: 5005,
    reason: 'test-signal',
  };
  return { ...base, ...overrides };
}

function makeContext(overrides: Partial<TicketBuildContext> = {}): TicketBuildContext {
  return {
    symbol: 'ES',
    strategy: 'orr',
    signals: [makeSignal()],
    risk: { maxRiskDollarsPerTrade: 500 },
    engineVersion: '0.5.0-orr-osb-vwapft',
    riskEngineVersion: '1.0.0',
    strategyConfigVersion: 42,
    ...overrides,
  };
}

describe('buildTicketsFromSignals', () => {
  test('builds tickets from valid signals', () => {
    const ctx = makeContext();
    const { tickets, rejected } = buildTicketsFromSignals(ctx);

    expect(rejected).toHaveLength(0);
    expect(tickets).toHaveLength(1);

    const ticket = tickets[0];
    expect(ticket.symbol).toBe('ES');
    expect(ticket.strategy).toBe('orr');
    expect(ticket.direction).toBe('LONG');
    expect(ticket.contracts).toBeGreaterThan(0);
    expect(ticket.riskDollars).toBeGreaterThan(0);
    expect(ticket.engineVersion).toBe('0.5.0-orr-osb-vwapft');
    expect(ticket.riskEngineVersion).toBe('1.0.0');
    expect(ticket.strategyConfigVersion).toBe(42);
    expect(ticket.targetPrice).toBeCloseTo(5005);
    expect(ticket.engineTimestamp).toBe('2025-01-15T14:30:00Z');
    expect(ticket.id).toContain('orr-ES-');
  });

  test('rejects when risk budget is too small', () => {
    const ctx = makeContext({ risk: { maxRiskDollarsPerTrade: 1 } });
    const { tickets, rejected } = buildTicketsFromSignals(ctx);

    expect(tickets).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].decision.approved).toBe(false);
  });

  test('rejects invalid stop distance signals', () => {
    const ctx = makeContext({
      signals: [
        makeSignal({
          entryPrice: 5000,
          stopPrice: 5000,
        }),
      ],
    });

    const { tickets, rejected } = buildTicketsFromSignals(ctx);
    expect(tickets).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].decision.reason).toMatch(/invalid stop distance/i);
  });

  test('handles empty signal arrays', () => {
    const ctx = makeContext({ signals: [] });
    const { tickets, rejected } = buildTicketsFromSignals(ctx);
    expect(tickets).toHaveLength(0);
    expect(rejected).toHaveLength(0);
  });

  test('produces tickets with positive contracts and risk', () => {
    const ctx = makeContext();
    const { tickets } = buildTicketsFromSignals(ctx);
    for (const ticket of tickets) {
      expect(ticket.contracts).toBeGreaterThan(0);
      expect(ticket.riskDollars).toBeGreaterThan(0);
    }
  });
});
