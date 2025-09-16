import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '@prism-apex/app-api/server.js';
import { resetSchedulerForTests } from '@prism-apex/app-api/jobs/scheduler.js';
import { TICKET_STRATEGIES } from '@prism-apex/app-api/schemas/ticket.js';
import type { FastifyInstance } from 'fastify';

describe('tickets API strategy validation', () => {
  const date = '2024-01-01';
  let app: FastifyInstance;

  beforeAll(() => {
    resetSchedulerForTests();
    app = buildServer();
  });

  afterAll(async () => {
    await app.close();
    resetSchedulerForTests();
  });

  for (const strategy of TICKET_STRATEGIES) {
    it(`accepts known strategy ${strategy}`, async () => {
      const res = await app.inject({ method: 'GET', url: `/tickets?date=${date}&strategy=${strategy}` });
      expect(res.statusCode).toBe(200);
    });
  }

  it('rejects unknown strategies', async () => {
    const res = await app.inject({ method: 'GET', url: `/tickets?date=${date}&strategy=UNKNOWN` });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid query');
  });
});
