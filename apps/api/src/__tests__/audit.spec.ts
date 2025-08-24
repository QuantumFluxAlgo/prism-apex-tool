import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { auditRoutes } from '../routes/audit.js';

describe('audit API', () => {
  it('returns last event', async () => {
    const app = Fastify();
    await app.register(auditRoutes);
    const res = await app.inject({ method: 'GET', url: '/audit/last' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.last).toMatchObject({ type: 'PANIC' });
  });
});
