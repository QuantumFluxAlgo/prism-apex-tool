import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PositionsPage from '../pages/Positions';
import type { CanonicalTicket } from '@prism-apex/shared';

const canonicalTicket = (overrides: Partial<CanonicalTicket> = {}): CanonicalTicket => ({
  id: overrides.id ?? 'pos-1',
  symbol: overrides.symbol ?? 'MES',
  strategyId: overrides.strategyId ?? 'VWAP_FT',
  side: overrides.side ?? 'LONG',
  quantity: overrides.quantity ?? 1,
  entryPrice: overrides.entryPrice ?? 100,
  stopPrice: overrides.stopPrice ?? 99,
  targetPrice: overrides.targetPrice ?? 103,
  createdAtUtc: overrides.createdAtUtc ?? '2024-01-01T13:30:00Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2024-01-01T14:00:00Z',
  completedAtUtc: overrides.completedAtUtc ?? null,
  sessionDateUtc: overrides.sessionDateUtc ?? '2024-01-01T00:00:00Z',
  totalRisk: overrides.totalRisk ?? 75,
  perContractRisk: overrides.perContractRisk ?? 75,
  pnl: overrides.pnl ?? 0,
  pnlRMultiple: overrides.pnlRMultiple ?? 1,
  rrMultiple: overrides.rrMultiple ?? 2,
});

vi.mock('../lib/api', () => ({
  fetchAnalyticsCanonicalTickets: vi.fn(),
  fetchTickets: vi.fn(),
  buildCanonicalTicketFromRow: vi.fn(),
}));

import {
  fetchAnalyticsCanonicalTickets,
  fetchTickets,
  buildCanonicalTicketFromRow,
} from '../lib/api';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PositionsPage', () => {
  it('renders positions from analytics helper when available', async () => {
    (fetchAnalyticsCanonicalTickets as vi.Mock).mockResolvedValue([
      canonicalTicket({ id: 'ana-1', symbol: 'ES' }),
    ]);
    (fetchTickets as vi.Mock).mockResolvedValue({ rows: [] });

    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('ES')).toBeInTheDocument();
    });
  });

  it('falls back to /api/tickets when analytics payload is empty', async () => {
    (fetchAnalyticsCanonicalTickets as vi.Mock).mockResolvedValue([]);
    (fetchTickets as vi.Mock).mockResolvedValue({
      rows: [{ id: 'row-1' }],
    });
    (buildCanonicalTicketFromRow as vi.Mock).mockReturnValue(
      canonicalTicket({ id: 'fallback-1', symbol: 'NQ' }),
    );

    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('NQ')).toBeInTheDocument();
    });
  });
});
