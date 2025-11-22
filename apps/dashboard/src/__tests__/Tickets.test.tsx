import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToastProvider from '../context/ToastContext.js';

const { fetchTicketsMock, fetchSymbolsMock, recordOperatorActionMock } = vi.hoisted(() => {
  const sampleTickets = [
    {
      id: 't-long',
      symbol: 'ESZ4',
      strategy: 'ORR',
      direction: 'LONG',
      status: 'OPEN',
      opened_at_utc: new Date().toISOString(),
      entry_price: 4800,
      stop_price: 4798,
      target_price: 4804,
    },
    {
      id: 't-short',
      symbol: 'NQZ4',
      strategy: 'ORR',
      direction: 'SHORT',
      status: 'OPEN',
      opened_at_utc: new Date().toISOString(),
      entry_price: 15000,
      stop_price: 15010,
      target_price: 14980,
    },
  ];
  const fetchTicketsMock = vi.fn().mockResolvedValue({ rows: sampleTickets, total: sampleTickets.length });
  const fetchSymbolsMock = vi.fn().mockResolvedValue(['ES=F', 'NQ=F']);
  const recordOperatorActionMock = vi.fn().mockResolvedValue(undefined);
  return { fetchTicketsMock, fetchSymbolsMock, recordOperatorActionMock };
});

vi.mock('../lib/api', () => ({
  fetchTickets: fetchTicketsMock,
  fetchSymbols: fetchSymbolsMock,
  recordOperatorAction: recordOperatorActionMock,
}));

import TicketsPage from '../pages/Tickets.js';

function renderTickets() {
  render(
    <ToastProvider>
      <TicketsPage />
    </ToastProvider>,
  );
}

describe('TicketsPage', () => {
  beforeEach(() => {
    fetchTicketsMock.mockClear();
    fetchSymbolsMock.mockClear();
    recordOperatorActionMock.mockReset();
    recordOperatorActionMock.mockResolvedValue(undefined);
  });

  it('hides SHORT rows until toggle enabled', async () => {
    renderTickets();
    expect(await screen.findByText('ESZ4')).toBeInTheDocument();
    expect(screen.queryByText('NQZ4')).not.toBeInTheDocument();

    const toggle = screen.getByLabelText('Show SHORTs (view-only)');
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText('NQZ4')).toBeInTheDocument());
  });

  it('re-fetches tickets when toggling SHORT visibility', async () => {
    renderTickets();
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalledTimes(1));

    const toggle = screen.getByLabelText('Show SHORTs (view-only)');
    fireEvent.click(toggle);

    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalledTimes(2));
  });

  it('records operator action and refreshes tickets', async () => {
    renderTickets();
    const button = await screen.findByRole('button', { name: 'Actioned' });

    fireEvent.click(button);

    await waitFor(() => expect(recordOperatorActionMock).toHaveBeenCalledWith('t-long', 'ACTIONED'));
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Operator action recorded.')).toBeInTheDocument();
  });

  it('shows toast when operator action fails', async () => {
    recordOperatorActionMock.mockRejectedValueOnce(new Error('boom'));
    renderTickets();
    const button = await screen.findByRole('button', { name: 'Actioned' });

    fireEvent.click(button);

    await waitFor(() => expect(recordOperatorActionMock).toHaveBeenCalled());
    expect(await screen.findByText('Operator action failed; please retry.')).toBeInTheDocument();
    expect(fetchTicketsMock).toHaveBeenCalledTimes(1);
  });
});
