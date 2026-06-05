import { beforeAll, afterAll, describe, expect, it, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '@prism-apex/app-api/server.js';
import type { RecordOperatorActionInput } from '@prism-apex/app-api/services/tickets/operatorAction.js';

const { mockedRecordOperatorAction, TicketNotFoundError } = vi.hoisted(() => {
  class TicketNotFoundError extends Error {}
  const mockedRecordOperatorAction = vi.fn<[RecordOperatorActionInput], Promise<void>>();
  return { mockedRecordOperatorAction, TicketNotFoundError };
});

vi.mock('@prism-apex/app-api/services/tickets/operatorAction.js', () => ({
  recordOperatorAction: mockedRecordOperatorAction,
  TicketNotFoundError,
}));

describe('POST /tickets/:ticketId/operator-action', () => {
  let app: FastifyInstance;

  beforeAll(() => {
    process.env.DISABLE_JOBS = '1';
    app = buildServer();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.DISABLE_JOBS;
  });

  beforeEach(() => {
    mockedRecordOperatorAction.mockReset();
  });

  it('returns 204 when operator action is recorded', async () => {
    mockedRecordOperatorAction.mockResolvedValue(undefined);

    const res = await app.inject({
      method: 'POST',
      url: '/tickets/test-ticket/operator-action',
      payload: { action: 'ACTIONED', note: 'looks good' },
    });

    expect(res.statusCode).toBe(204);
    expect(mockedRecordOperatorAction).toHaveBeenCalledWith({
      ticketId: 'test-ticket',
      action: 'ACTIONED',
      note: 'looks good',
    });
  });

  it('rejects invalid actions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/test-ticket/operator-action',
      payload: { action: 'UNKNOWN' },
    });

    expect(res.statusCode).toBe(400);
    expect(mockedRecordOperatorAction).not.toHaveBeenCalled();
  });

  it('returns 404 when ticket is missing', async () => {
    mockedRecordOperatorAction.mockRejectedValue(new TicketNotFoundError('missing-ticket'));

    const res = await app.inject({
      method: 'POST',
      url: '/tickets/missing-ticket/operator-action',
      payload: { action: 'SKIPPED' },
    });

    expect(res.statusCode).toBe(404);
  });
});
