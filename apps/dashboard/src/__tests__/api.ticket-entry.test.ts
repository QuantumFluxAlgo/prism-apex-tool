import { afterEach, describe, expect, it, vi } from 'vitest';

import { markTicketEntered } from '../lib/api';

describe('markTicketEntered', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('patches the encoded ticket-entered endpoint through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, ticketId: 'TICKET/123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await markTicketEntered('TICKET/123');

    expect(response).toEqual({ ok: true, ticketId: 'TICKET/123' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tickets/TICKET%2F123/entered',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
      },
    );
  });

  it('rejects blank ticket ids before issuing a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    let error: unknown = null;
    try {
      await markTicketEntered('   ');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Ticket id is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
