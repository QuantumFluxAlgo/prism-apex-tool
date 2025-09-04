import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { setJobBeat, __resetHealth } from '@prism-apex-tool/runtime';

import { buildServer } from '../server.js';

beforeEach(() => {
  vi.useFakeTimers();
  __resetHealth();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/ready', () => {
  it('reports job health', async () => {
    const app = buildServer();

    // Set jobs as healthy
    setJobBeat('alpha');
    setJobBeat('beta');

    let res = await app.inject({ method: 'GET', url: '/ready' });
    let body = res.json();

    // Ensure both jobs are healthy
    expect(body.jobs.alpha?.healthy).toBe(true);
    expect(body.jobs.beta?.healthy).toBe(true);
    expect(body.overall).toBe('healthy'); // Expect overall to be healthy

    await vi.advanceTimersByTimeAsync(11_000);
    res = await app.inject({ method: 'GET', url: '/ready' });
    body = res.json();

    // After the timer, alpha should become unhealthy, and overall should be degraded
    expect(body.jobs.alpha.healthy).toBe(false);
    expect(body.overall).toBe('degraded');
    await app.close();
  });
});
