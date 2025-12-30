import { describe, it, expect } from 'vitest';
import { buildServer } from '@prism-apex/app-api/server.js';
import { setJobBeat } from '@prism-apex/runtime';

describe('job lifecycle', () => {
  it('reflects job running state in /ready', async () => {
    const app = buildServer();
    const now = Date.now();
    setJobBeat('marketFeed', now);
    let res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.healthy).toBe(true);
    setJobBeat('marketFeed', now - 700_000);
    res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.healthy).toBe(false);
    await app.close();
  });
});
