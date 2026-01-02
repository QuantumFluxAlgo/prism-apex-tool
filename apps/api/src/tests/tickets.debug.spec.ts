import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestServerTicketsDebug } from './testServerTicketsDebug.js';
import { appendTickets, clearTickets } from '../utils/mockStore.js';
import * as telemetry from '../services/tickets/ticketsTelemetry.js';

vi.spyOn(telemetry, 'emitTicketQualityTelemetry').mockResolvedValue();

describe('GET /tickets/debug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTickets();
  });

  it('filters by minEntryRR and emits telemetry', async () => {
    const app = await buildTestServerTicketsDebug();

    appendTickets([
      {
        id: 'low-rr',
        ts: '2025-01-01T00:00:00Z',
        symbol: 'ES',
        strategy: 'ORR',
        side: 'LONG',
        price: 100,
        size: 1,
        status: 'ACCEPTED',
        meta: { rrMultiple: 0.5 },
      } as any,
      {
        id: 'high-rr',
        ts: '2025-01-01T00:00:01Z',
        symbol: 'ES',
        strategy: 'ORR',
        side: 'LONG',
        price: 100,
        size: 1,
        status: 'ACCEPTED',
        meta: { rrMultiple: 2.0 },
      } as any,
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/tickets/debug?minEntryRR=1.5',
    });

    expect(res.statusCode).toBe(200);
    const rows = res.json();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('high-rr');

    expect(telemetry.emitTicketQualityTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'tickets-debug',
        filters: expect.objectContaining({ minEntryRR: 1.5 }),
      }),
    );
  });
});
