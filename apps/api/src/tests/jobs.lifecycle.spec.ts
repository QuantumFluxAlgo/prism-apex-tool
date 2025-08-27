import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../server.js';
import { setJobBeat } from '@prism-apex-tool/runtime';

describe('job lifecycle', () => {
  it('reflects job running state in /ready', async () => {
    vi.useFakeTimers();
    const app = buildServer();
    setJobBeat('marketFeed');
    let res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.healthy).toBe(true);
    await vi.advanceTimersByTimeAsync(11_000);
    res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.healthy).toBe(false);
    vi.useRealTimers();
    await app.close();
  });
});
