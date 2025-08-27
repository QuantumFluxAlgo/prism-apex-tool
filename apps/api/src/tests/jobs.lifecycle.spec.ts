import { describe, it, expect } from 'vitest';
import { buildServer } from '../server.js';
import { startJobs, stopAllJobs, resetJobsForTests } from '../jobs/jobManager';
import { getJobManagerForTests } from '../jobs/jobManagerTestHooks';

describe('job lifecycle', () => {
  it('reflects job running state in /ready', async () => {
    const app = buildServer();
    const jm = getJobManagerForTests();
    jm.resetForTests();
    resetJobsForTests();
    jm.register(
      'FEED',
      async () => {},
      async () => {},
    );

    let res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.running).toBe(false);

    await startJobs();
    res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.running).toBe(true);

    await stopAllJobs();
    res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json().jobs.marketFeed.running).toBe(false);

    await app.close();
  });
});
