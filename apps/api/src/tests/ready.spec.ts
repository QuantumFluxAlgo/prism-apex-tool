import { describe, it, expect } from 'vitest';
import { setJobBeat, __resetHealth } from '@prism-apex/runtime';
import { buildServer } from '@prism-apex/app-api/server.js';

describe('/ready', () => {
  it('reports job health deterministically', async () => {
    __resetHealth();
    const app = buildServer();
    __resetHealth();
    const now = Date.now();

    setJobBeat('alpha', now);
    setJobBeat('beta', now);
    setJobBeat('marketFeed', now);

    let res = await app.inject({ method: 'GET', url: '/ready' });
    let body = res.json();
    expect(body.jobs.alpha.healthy).toBe(true);
    expect(body.jobs.beta.healthy).toBe(true);
    expect(body.overall).toBe('healthy');

    const staleTs = now - 700_000;
    setJobBeat('alpha', staleTs);
    setJobBeat('beta', staleTs);

    res = await app.inject({ method: 'GET', url: '/ready' });
    body = res.json();
    expect(body.jobs.alpha.healthy).toBe(false);
    expect(body.jobs.beta.healthy).toBe(false);
    expect(body.overall).toBe('degraded');

    await app.close();
  });
});
