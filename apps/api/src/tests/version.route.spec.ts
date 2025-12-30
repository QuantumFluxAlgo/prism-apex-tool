import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import versionRoute from '../routes/version.js';

describe('GET /version', () => {
  it('returns metadata without throwing', async () => {
    const app = Fastify({ logger: false });
    await app.register(versionRoute);

    const res = await app.inject({ method: 'GET', url: '/version' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      name: expect.any(String),
      version: expect.any(String),
      node: expect.any(String),
      env: expect.any(String),
    });
  }, 20_000);
});
