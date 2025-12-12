import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from '../pages/Analytics';
import type { CanonicalTicket } from '@prism-apex/shared';

const canonicalTicket = (overrides: Partial<CanonicalTicket> = {}): CanonicalTicket => ({
  id: overrides.id ?? 'tick-1',
  symbol: overrides.symbol ?? 'ES',
  strategyId: overrides.strategyId ?? 'OSB',
  side: 'LONG',
  entryPrice: 100,
  stopPrice: 99,
  targetPrice: 103,
  quantity: 1,
  sessionDateUtc: overrides.sessionDateUtc ?? '2024-01-01T00:00:00Z',
  createdAtUtc: overrides.createdAtUtc ?? '2024-01-01T13:30:00Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2024-01-01T13:45:00Z',
  completedAtUtc: overrides.completedAtUtc ?? '2024-01-01T14:00:00Z',
  pnl: overrides.pnl ?? 150,
  pnlRMultiple: overrides.pnlRMultiple ?? 1.5,
  rrMultiple: overrides.rrMultiple ?? 2,
  totalRisk: overrides.totalRisk ?? 75,
  perContractRisk: overrides.perContractRisk ?? 75,
  targetTicks: overrides.targetTicks ?? 10,
  stopTicks: overrides.stopTicks ?? 5,
  expectedReward: overrides.expectedReward ?? 150,
});

vi.mock('../lib/api', () => ({
  fetchTickets: vi.fn(),
  buildCanonicalTicketFromRow: vi.fn(),
}));

import { fetchTickets, buildCanonicalTicketFromRow } from '../lib/api';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AnalyticsPage', () => {
  it('aggregates canonical tickets into sessions', async () => {
    (fetchTickets as vi.Mock).mockResolvedValue({
      rows: [
        { id: '1' },
        { id: '2' },
      ],
    });
    const canonicalRows = [
      canonicalTicket({ id: '1', pnl: 200 }),
      canonicalTicket({ id: '2', pnl: -50 }),
    ];
    let idx = 0;
    (buildCanonicalTicketFromRow as vi.Mock).mockImplementation(() => canonicalRows[idx++]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    });

    expect(screen.getByText(/OSB/i)).toBeInTheDocument();
    expect(screen.getByText('+150')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // trades column
  });

  it('shows empty state when no tickets returned', async () => {
    (fetchTickets as vi.Mock).mockResolvedValue({ rows: [] });
    (buildCanonicalTicketFromRow as vi.Mock).mockReturnValue(null);

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load analytics history/i),
      ).toBeInTheDocument();
    });
  });
});
