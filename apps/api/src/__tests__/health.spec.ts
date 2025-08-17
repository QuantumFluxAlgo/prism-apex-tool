import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { buildServer } from '../server.js';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
