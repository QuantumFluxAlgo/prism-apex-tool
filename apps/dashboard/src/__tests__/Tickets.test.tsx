import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TicketsPage from '../pages/Tickets.js';

const fetchMock = vi.fn();

function stubFetchWith(data: unknown, init: Partial<Response> = {}) {
  fetchMock.mockResolvedValue({
    ok: init.ok ?? true,
    json: async () => data,
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
    stubFetchWith({ rows: [], total: 0 });
    renderTickets();

    expect(screen.getByText(/Loading tickets/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

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
