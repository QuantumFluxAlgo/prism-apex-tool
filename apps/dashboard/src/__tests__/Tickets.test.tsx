import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const sampleTickets = [
  {
    symbol: 'ESZ4',
    side: 'BUY',
    entry: 4800,
    stop: 4798,
    target: 4804,
    qty: 1,
    accountId: 'A1',
    timestampUtc: new Date().toISOString(),
    meta: { strategy: 'VWAP_FT', rr: 2, guardrails: [] },
    accepted: true,
  },
  {
    symbol: 'NQZ4',
    side: 'SELL',
    entry: 15000,
    stop: 15010,
    target: 14980,
    qty: 1,
    accountId: 'A1',
    timestampUtc: new Date().toISOString(),
    meta: { strategy: 'OSB', rr: 1.5, guardrails: [] },
    accepted: false,
    reasons: ['test'],
  },
];

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ tickets: sampleTickets, nextCursor: null }),
});
vi.stubGlobal('fetch', fetchMock);

import TicketsPage from '../pages/Tickets';

describe('TicketsPage', () => {
  it('toggles accepted/rejected filters', async () => {
    render(<TicketsPage />);
    await screen.findByText('ESZ4');

    const acceptedToggle = screen.getByLabelText('Accepted');
    fireEvent.click(acceptedToggle);
    await waitFor(() => expect(screen.queryByText('ESZ4')).not.toBeInTheDocument());

    const rejectedToggle = screen.getByLabelText('Rejected');
    fireEvent.click(rejectedToggle);
    await waitFor(() => expect(screen.queryByText('NQZ4')).not.toBeInTheDocument());
  });

  it('copies entry to clipboard', async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(<TicketsPage />);
    await screen.findByText('ESZ4');

    fireEvent.click(screen.getAllByText('Copy')[1]);
    const entryBtn = screen.getAllByRole('button', { name: 'Entry' })[0];
    fireEvent.click(entryBtn);
    expect(writeText).toHaveBeenCalledWith('4800');
  });
});
