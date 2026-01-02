import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TicketsPage from '../pages/Tickets.js';
import { fetchTickets, fetchYahooHealth } from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchTickets: vi.fn(),
  fetchYahooHealth: vi.fn(),
}));

const mockHealth = {
  status: 'live',
  rows: [
    {
      symbol: 'ES',
      status: 'GREEN',
      lag_seconds: 42,
      last_bar_timestamp: '2025-01-01T12:00:00Z',
    },
  ],
};

function stubFetchWith(data: unknown) {
  vi.mocked(fetchTickets).mockResolvedValue(data as any);
}

function stubFetchError(message: string) {
  vi.mocked(fetchTickets).mockRejectedValue(new Error(message));
}

function renderTickets() {
  render(<TicketsPage />);
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchTickets).mockReset();
    vi.mocked(fetchYahooHealth).mockReset();
    vi.mocked(fetchYahooHealth).mockResolvedValue(mockHealth as any);
  });

  it('renders loading state and fetches the tickets endpoint', async () => {
    stubFetchWith({ rows: [], total: 0 });
    renderTickets();

    expect(screen.getByText(/Loading tickets/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchTickets).toHaveBeenCalledTimes(1));
    expect(fetchYahooHealth).toHaveBeenCalledTimes(1);
  });

  it('shows table rows when tickets are returned', async () => {
    const response = {
      total: 1,
      rows: [
        {
          id: 't-123',
          symbol: 'MESZ4',
          side: 'LONG',
          status: 'ACTIONED',
          strategy: 'VWAP',
          opened_at_utc: '2025-12-04T12:00:00Z',
        },
      ],
    };
    stubFetchWith(response);

    renderTickets();

    expect(await screen.findByText('MESZ4')).toBeInTheDocument();
    expect(screen.getAllByText('LONG').length).toBeGreaterThan(0);
    expect(screen.getByText('VWAP')).toBeInTheDocument();
    expect(screen.getByText(/12:00/)).toBeInTheDocument();
  });

  it('shows empty state when no tickets are returned', async () => {
    stubFetchWith({ rows: [], total: 0 });

    renderTickets();
    await waitFor(() => expect(fetchTickets).toHaveBeenCalled());

    expect(
      await screen.findByText(/No tickets returned for the current filters/i),
    ).toBeInTheDocument();
  });

  it('shows an error message when fetch fails', async () => {
    stubFetchError('boom');

    renderTickets();

    const el = await screen.findByText(/Error loading tickets:/i);
    expect(el.textContent ?? '').toMatch(/boom/);
  });
});
