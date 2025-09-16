import { beforeEach, afterEach } from 'vitest';
import {
  jobManager,
  startJobs,
  stopAllJobs,
} from '../../jobs/jobManager.ts';
import { resetSchedulerForTests } from '../../jobs/scheduler.ts';

export function withJobs() {
  beforeEach(async () => {
    jobManager.resetForTests();
    resetSchedulerForTests();
    process.env.DISABLE_JOBS = '0';
    await startJobs();
  });

  afterEach(async () => {
    await stopAllJobs();
    resetSchedulerForTests();
    jobManager.resetForTests();
    process.env.DISABLE_JOBS = '1';
  });
}
