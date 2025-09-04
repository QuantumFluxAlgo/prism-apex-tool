import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;
let setJobBeat: typeof import('@prism-apex-tool/runtime').setJobBeat;
let __resetHealth: typeof import('@prism-apex-tool/runtime').__resetHealth;

beforeEach(async () => {
  vi.resetModules(); // avoid double registration/state
  vi.useFakeTimers();
  process.env.RATE_LIMIT_MAX = '2';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_BUCKETS = '10';
  delete process.env.BEARER_TOKEN; // ensure auth is OFF for these tests
  ({ buildServer } = await import('../server.js'));
  ({ setJobBeat, __resetHealth } = await import('@prism-apex-tool/runtime'));
  __resetHealth();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Hardening', () => {
  it('returns readiness', async () => {
    const app = buildServer();

    // Set all jobs to healthy
    setJobBeat('alpha');
    setJobBeat('beta');
    setJobBeat('marketFeed');

    // No real sleeping; the health uses Date.now, so it's instant

    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Ensure job is healthy and overall is healthy
    expect(body.jobs.alpha?.healthy).toBe(true);
    expect(body.jobs.beta?.healthy).toBe(true);
    expect(body.jobs.marketFeed?.healthy).toBe(true);
    expect(body.overall).toBe('healthy'); // Expect overall to be healthy
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
