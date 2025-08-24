import { beforeEach, describe, expect, it, vi } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  vi.resetModules(); // avoid double registration/state
  process.env.RATE_LIMIT_MAX = '2';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_BUCKETS = '10';
  delete process.env.BEARER_TOKEN; // ensure auth is OFF for these tests
  ({ buildServer } = await import('../server.js'));
});

describe('Hardening', () => {
  it('returns readiness', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, ready: true });
    await app.close();
  });

  it('applies basic rate limit (429 after threshold) and sets Retry-After', async () => {
    const app = buildServer();
    await app.inject({ method: 'GET', url: '/market/symbols' });
    await app.inject({ method: 'GET', url: '/market/symbols' });
    const r3 = await app.inject({ method: 'GET', url: '/market/symbols' });
    expect(r3.statusCode).toBe(429);
    const retryAfter = r3.headers['retry-after'];
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(0);
    await app.close();
  });

  it('does not rate-limit CORS preflight (OPTIONS)', async () => {
    const app = buildServer();
    // hammer OPTIONS beyond the limit; should not 429
    await app.inject({
      method: 'OPTIONS',
      url: '/market/symbols',
      headers: { Origin: 'http://example.com' },
    });
    await app.inject({
      method: 'OPTIONS',
      url: '/market/symbols',
      headers: { Origin: 'http://example.com' },
    });
    const r3 = await app.inject({
      method: 'OPTIONS',
      url: '/market/symbols',
      headers: { Origin: 'http://example.com' },
    });
    expect(r3.statusCode).toBeLessThan(429);
    await app.close();
  });

  it('adds CORS header on responses', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/market/sessions',
      headers: { Origin: 'http://example.com' },
    });
    expect(res.statusCode).toBe(200);
    const acao = res.headers['access-control-allow-origin'];
    expect(typeof acao).toBe('string');
    expect(String(acao).length).toBeGreaterThan(0);
    await app.close();
  });
});
