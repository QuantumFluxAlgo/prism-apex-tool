import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import StrategyLabPage from '../pages/StrategyLab.js';

const fetchAnalyticsCanonicalTicketsMock = vi.fn();

vi.mock('../lib/api.js', () => ({
  fetchAnalyticsCanonicalTickets: (...args: any[]) =>
    fetchAnalyticsCanonicalTicketsMock(...args),
}));

describe('StrategyLabPage', () => {
  beforeEach(() => {
    fetchAnalyticsCanonicalTicketsMock.mockReset();
  });

  it('renders loading state and calls the analytics helper', async () => {
    fetchAnalyticsCanonicalTicketsMock.mockResolvedValueOnce([]);

    render(<StrategyLabPage />);

    // Basic smoke: header is present and helper is invoked.
    expect(screen.getAllByText(/Strategy Lab/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(fetchAnalyticsCanonicalTicketsMock).toHaveBeenCalled();
    });
  });

  it('renders KPIs when analytics tickets are returned', async () => {
    fetchAnalyticsCanonicalTicketsMock.mockResolvedValueOnce([
      {
        id: 't1',
        symbol: 'ES',
        strategyCode: 'ORR',
        side: 'LONG',
        pnl: 250,
        rMultiple: 1.5,
        analyticsDateLabel: '2025-02-18',
        regimeLabel: 'TrendUp',
        newsLabel: 'No major news',
      },
    ]);

    render(<StrategyLabPage />);

    // KPI labels show up
    expect(await screen.findByText(/Total PnL/i)).toBeInTheDocument();
    expect(await screen.findByText(/ES/)).toBeInTheDocument();
  });

  it('shows an error message when analytics helper rejects', async () => {
    fetchAnalyticsCanonicalTicketsMock.mockRejectedValueOnce(
      new Error('boom'),
    );

    render(<StrategyLabPage />);

    expect(
      await screen.findByText(/Error loading analytics tickets/i),
    ).toBeInTheDocument();
  });
});
