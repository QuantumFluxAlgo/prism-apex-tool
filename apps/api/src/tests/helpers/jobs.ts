import { startJobs, stopAllJobs } from '../../jobs/jobManager.js';

export function withJobs() {
  import('vitest').then(({ beforeAll, afterAll }) => {
    beforeAll(async () => {
      process.env.DISABLE_JOBS = '0';
      await startJobs();
    });
    afterAll(async () => {
      await stopAllJobs();
      process.env.DISABLE_JOBS = '1';
    });
  });
}
