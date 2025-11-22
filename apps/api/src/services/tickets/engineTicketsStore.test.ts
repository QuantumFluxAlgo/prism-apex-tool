import { describe, expect, test } from 'vitest';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { HardStopDecision } from '../../risk/hardStop.js';
import type { MinimalTicket } from './engineTickets.js';
import { mapEngineTicketsToRows, type EngineTicketPersistContext } from './engineTicketsStore.js';

function makeTicket(overrides: Partial<MinimalTicket> = {}): MinimalTicket {
  return {
    id: 'orr-ES-2025-01-15T14:30:00Z',
    symbol: 'ES',
    strategy: 'orr',
    direction: 'LONG',
    contracts: 2,
    entryPrice: 5000,
    stopPrice: 4997.5,
    targetPrice: 5005,
    riskDollars: 250,
    rewardDollars: 500,
    rrMultiple: 2,
    engineTimestamp: '2025-01-15T14:30:00Z',
    engineVersion: '0.5.0-orr-osb-vwapft',
    riskEngineVersion: '1.0.0',
    strategyConfigVersion: 42,
    reason: 'test',
    ...overrides,
  };
}

function makeSignal(overrides: Partial<EngineSignal> = {}): EngineSignal {
  return {
    id: 'sig-1',
    timestamp: '2025-01-15T15:00:00Z',
    direction: 'LONG',
    price: 5001,
    entryPrice: 5001,
    stopPrice: 4998,
    targetPrice: 5006,
    reason: 'test-signal',
    ...overrides,
  };
}

function makeDecision(overrides: Partial<HardStopDecision> = {}): HardStopDecision {
  return {
    approved: false,
    symbol: 'ES',
    entryPrice: 5001,
    stopPrice: 4998,
    contracts: 0,
    riskDollars: 0,
    reason: 'rejected',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<EngineTicketPersistContext> = {}): EngineTicketPersistContext {
  return {
    symbol: 'ES',
    strategy: 'orr',
    sessionDate: '2025-01-15',
    engineVersion: '0.5.0-orr-osb-vwapft',
    riskEngineVersion: '1.0.0',
    strategyConfigVersion: 42,
    tickets: [],
    rejected: [],
    meta: { source: 'unit-test' },
    ...overrides,
  };
}

describe('mapEngineTicketsToRows', () => {
  test('maps approved tickets with positive size and risk', () => {
    const ctx = makeCtx({ tickets: [makeTicket()] });
    const rows = mapEngineTicketsToRows(ctx);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.status).toBe('approved');
    expect(row.contracts).toBeGreaterThan(0);
    expect(row.riskDollars).toBeGreaterThan(0);
    expect(row.rejectionReason).toBeNull();
    expect(row.meta).toEqual({
      source: 'unit-test',
      riskEngineVersion: '1.0.0',
      strategyConfigVersion: 42,
      contracts: 2,
      riskDollars: 250,
      rewardDollars: 500,
      rrMultiple: 2,
    });
  });

  test('maps rejected entries with zero size and reason', () => {
    const ctx = makeCtx({
      rejected: [{ signal: makeSignal(), decision: makeDecision({ reason: 'too much risk' }) }],
    });
    const rows = mapEngineTicketsToRows(ctx);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.status).toBe('rejected');
    expect(row.contracts).toBe(0);
    expect(row.riskDollars).toBe(0);
    expect(row.rejectionReason).toBe('too much risk');
    expect(row.meta).toEqual({
      source: 'unit-test',
      riskEngineVersion: '1.0.0',
      strategyConfigVersion: 42,
      contracts: 0,
      riskDollars: 0,
    });
  });

  test('handles mixed approved + rejected rows', () => {
    const ctx = makeCtx({
      tickets: [makeTicket()],
      rejected: [{ signal: makeSignal({ id: 'sig-2' }), decision: makeDecision() }],
    });
    const rows = mapEngineTicketsToRows(ctx);
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.status === 'approved')).toBe(true);
    expect(rows.some((row) => row.status === 'rejected')).toBe(true);
  });

  test('returns empty array when nothing to persist', () => {
    const ctx = makeCtx();
    expect(mapEngineTicketsToRows(ctx)).toHaveLength(0);
  });
});
