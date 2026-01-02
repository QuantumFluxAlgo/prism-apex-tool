import type { CanonicalTicket } from '@prism-apex/shared';
import {
  longTrendPullbackMesFixture,
  longVwapTouchEsFixture,
  makeCanonicalTicketFixture,
  shortOpeningBreakNqFixture,
} from '@prism-apex/shared';

import type { TicketRow } from './api';

function cloneTicket(
  source: CanonicalTicket,
  overrides: Partial<CanonicalTicket> = {},
): CanonicalTicket {
  return {
    ...source,
    tags: source.tags ? [...source.tags] : undefined,
    ...overrides,
  } satisfies CanonicalTicket;
}

const canonicalTicketSeeds: CanonicalTicket[] = [
  cloneTicket(longVwapTouchEsFixture, {
    id: 'WORKLIST-V2-ES-OPEN',
    status: 'OPEN',
    createdAtUtc: '2025-02-18T14:20:00Z',
    updatedAtUtc: '2025-02-18T14:22:00Z',
    sessionDateUtc: '2025-02-18',
    rrMultiple: 1.5,
  }),
  cloneTicket(shortOpeningBreakNqFixture, {
    id: 'WORKLIST-V2-NQ-ACTIONED',
    status: 'ACTIONED',
    createdAtUtc: '2025-02-18T13:32:00Z',
    updatedAtUtc: '2025-02-18T13:38:00Z',
  }),
  cloneTicket(longTrendPullbackMesFixture, {
    id: 'WORKLIST-V2-MES-COMPLETE',
    status: 'COMPLETE',
  }),
  makeCanonicalTicketFixture({
    id: 'WORKLIST-V2-MES-FILLED',
    symbol: 'MES=F',
    side: 'LONG',
    entryPrice: 5008.75,
    stopPrice: 5004.75,
    targetPrice: 5023.75,
    exitPrice: 5021.5,
    stopTicks: 16,
    targetTicks: 60,
    quantity: 3,
    perContractRisk: 200,
    totalRisk: 600,
    expectedReward: 900,
    rrMultiple: 1.5,
    pnl: 825,
    pnlRMultiple: 1.2,
    status: 'FILLED',
    createdAtUtc: '2025-02-18T14:45:00Z',
    updatedAtUtc: '2025-02-18T15:05:00Z',
    completedAtUtc: '2025-02-18T15:05:00Z',
    sessionDateUtc: '2025-02-18',
    notes: 'Manual exit on strong momentum',
  }),
  makeCanonicalTicketFixture({
    id: 'WORKLIST-V2-ES-EXPIRED',
    symbol: 'ES=F',
    side: 'SHORT',
    entryPrice: 17845.5,
    stopPrice: 17870.5,
    targetPrice: 17795.5,
    entryTicksFromRef: -8,
    stopTicks: 25,
    targetTicks: 50,
    quantity: 1,
    perContractRisk: 625,
    totalRisk: 625,
    expectedReward: 1250,
    rrMultiple: 2,
    status: 'EXPIRED',
    createdAtUtc: '2025-02-18T15:30:00Z',
    updatedAtUtc: '2025-02-18T16:00:00Z',
    completedAtUtc: '2025-02-18T16:00:00Z',
    completedBy: 'system',
    sessionDateUtc: '2025-02-18',
    contextRegime: 'range',
    tags: ['OSB', 'expired'],
  }),
];

function canonicalTicketToTicketRow(ticket: CanonicalTicket): TicketRow {
  return {
    ...ticket,
    tags: ticket.tags ? [...ticket.tags] : undefined,
    strategy: ticket.strategyId,
    direction: ticket.side,
    session_date_utc: ticket.sessionDateUtc,
    opened_at_utc: ticket.createdAtUtc,
    closed_at_utc: ticket.completedAtUtc ?? null,
    entry_price: ticket.entryPrice,
    exit_price: ticket.exitPrice ?? null,
    stop_price: ticket.stopPrice,
    target_price: ticket.targetPrice,
    pnl: ticket.pnl ?? null,
    strategy_version: ticket.strategyVersion ?? null,
    completed_at_utc: ticket.completedAtUtc ?? null,
    completed_by: ticket.completedBy ?? null,
  } satisfies TicketRow;
}

/**
 * Returns canonical Worklist V2 tickets. Callers must treat these camelCase
 * fields as the only source of truth.
 */
export function getWorklistV2CanonicalTickets(): CanonicalTicket[] {
  return canonicalTicketSeeds.map((ticket) => ({
    ...ticket,
    tags: ticket.tags ? [...ticket.tags] : undefined,
  }));
}

/**
 * Legacy shim for consumers that still expect snake_case Worklist rows. These
 * fields are derived from CanonicalTicket and should be removed once the UI
 * consumes the canonical contract directly.
 */
export function getWorklistV2TicketRows(): TicketRow[] {
  return getWorklistV2CanonicalTickets().map(canonicalTicketToTicketRow);
}
