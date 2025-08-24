import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { healthRoutes } from '../routes/health.js';
import { versionRoutes } from '../routes/version.js';

describe('basic API routes', () => {
  it('health', async () => {
    const app = Fastify();
    await app.register(healthRoutes);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('version', async () => {
    const app = Fastify();
    await app.register(versionRoutes);
    const res = await app.inject({ method: 'GET', url: '/version' });
    expect(res.statusCode).toBe(200);
    expect(res.json().version).toBeTruthy();
  });
});
