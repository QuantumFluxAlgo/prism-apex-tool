import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../server.js';
import { setJobBeat, __resetHealth } from '@prism-apex-tool/runtime';

describe('/ready', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    __resetHealth();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports job health', async () => {
    const app = buildServer();

    setJobBeat('alpha', Date.now());
    setJobBeat('beta', Date.now());

    let res = await app.inject({ method: 'GET', url: '/ready' });
    let body = res.json();

    expect(body.jobs.alpha.healthy).toBe(true);
    expect(body.jobs.beta.healthy).toBe(true);
    expect(body.overall).toBe('healthy');

    await vi.advanceTimersByTimeAsync(11_000);
    res = await app.inject({ method: 'GET', url: '/ready' });
    body = res.json();

    expect(body.jobs.alpha.healthy).toBe(false);
    expect(body.jobs.beta.healthy).toBe(false); // both stale by 11s
    expect(body.overall).toBe('degraded');

    await app.close();
  });
});
