import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { setJobBeat, __resetHealth } from '@prism-apex-tool/runtime';
import { buildServer } from '../server.js';

describe('/ready', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    __resetHealth();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports job health deterministically', async () => {
    const app = buildServer();
    __resetHealth();

    setJobBeat('alpha');
    setJobBeat('beta');

    let res = await app.inject({ method: 'GET', url: '/ready' });
    let body = res.json();
    expect(body.jobs.alpha.healthy).toBe(true);
    expect(body.jobs.beta.healthy).toBe(true);
    expect(body.overall).toBe('healthy');

    await vi.advanceTimersByTimeAsync(11_000);

    res = await app.inject({ method: 'GET', url: '/ready' });
    body = res.json();
    expect(body.jobs.alpha.healthy).toBe(false);
    expect(body.jobs.beta.healthy).toBe(false);
    expect(body.overall).toBe('degraded');

    await app.close();
  });
});
