import { describe, expect, it, vi } from 'vitest';
import { setJobBeat } from '@prism-apex-tool/runtime';

import { buildServer } from '../server.js';

describe('/ready', () => {
  it('reports job health', async () => {
    vi.useFakeTimers();
    const app = buildServer();
    setJobBeat('alpha');
    setJobBeat('beta');
    let res = await app.inject({ method: 'GET', url: '/ready' });
    let body = res.json();
    expect(body.jobs.alpha.healthy).toBe(true);
    expect(body.overall).toBe('healthy');
    await vi.advanceTimersByTimeAsync(11_000);
    res = await app.inject({ method: 'GET', url: '/ready' });
    body = res.json();
    expect(body.jobs.alpha.healthy).toBe(false);
    expect(body.overall).toBe('degraded');
    vi.useRealTimers();
    await app.close();
  });
});
