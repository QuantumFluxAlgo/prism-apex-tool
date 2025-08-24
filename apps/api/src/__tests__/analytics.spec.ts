import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { analyticsRoutes } from '../routes/analytics.js';

describe('analytics API', () => {
  it('returns summary', async () => {
    const app = Fastify();
    await app.register(analyticsRoutes);
    const res = await app.inject({ method: 'GET', url: '/analytics/summary' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('pnl');
    expect(body).toHaveProperty('payoutStatus');
  });
});
