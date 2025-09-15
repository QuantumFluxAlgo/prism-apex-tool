import { startJobs, stopAllJobs, jobManager, resetJobsForTests } from '../../jobs/jobManager.js';

export function withJobs() {
  import('vitest').then(({ beforeEach, afterEach }) => {
    beforeEach(async () => {
      jobManager.resetForTests();
      resetJobsForTests();
      process.env.DISABLE_JOBS = '0';
      await startJobs();
    });
    afterEach(async () => {
      await stopAllJobs();
      resetJobsForTests();
      jobManager.resetForTests();
      process.env.DISABLE_JOBS = '1';
    });
  });
}
