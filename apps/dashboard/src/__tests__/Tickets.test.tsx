import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TicketsPage from '../pages/Tickets.js';

const fetchMock = vi.fn();

function stubFetchWith(data: unknown, init: Partial<Response> = {}) {
  fetchMock.mockResolvedValue({
    ok: init.ok ?? true,
    text: async () => JSON.stringify(data),
    ...init,
  } as Response);
}

function stubFetchError(message: string) {
  fetchMock.mockRejectedValue(new Error(message));
}

function renderTickets() {
  render(<TicketsPage />);
}

describe('TicketsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state and fetches the tickets endpoint', async () => {
    stubFetchWith([]);
    renderTickets();

    expect(screen.getByText(/Loading tickets/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('shows table rows when tickets are returned', async () => {
    const tickets = [
      {
        id: 't-123',
        symbol: 'MESZ4',
        side: 'LONG',
        status: 'OPEN',
        strategy: 'VWAP',
        openedAtUtc: '2025-12-04T12:00:00Z',
      },
    ];
    stubFetchWith(tickets);

    renderTickets();

    expect(await screen.findByText('MESZ4')).toBeInTheDocument();
    expect(screen.getByText('LONG')).toBeInTheDocument();
    expect(screen.getByText('VWAP')).toBeInTheDocument();
    expect(screen.getByText('2025-12-04T12:00:00Z')).toBeInTheDocument();
  });

  it('shows empty state when no tickets are returned', async () => {
    stubFetchWith([]);
    renderTickets();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      await screen.findByText(/No tickets returned for the current filters/i),
    ).toBeInTheDocument();
  });

  it('shows an error message when fetch fails', async () => {
    stubFetchError('boom');
    renderTickets();
    expect(
      await screen.findByText(/Error loading tickets: Error: boom/i),
    ).toBeInTheDocument();
  });
});
