import { afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { resetBusForTests } from '../lib/bus';
import { stopAllJobs, getJobManagerForTests, resetJobsForTests } from '../jobs/jobManagerTestHooks';

// Ensure the JobManager exists but does not auto-start anything.
beforeAll(() => {
  // Nothing to start by default. Suites that need jobs will start them explicitly.
});

// Keep tests isolated: prevents job re-registration & stale singletons
beforeEach(() => {
  vi.resetModules();
  if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'fatal';
});

// Clean up after *every* test to prevent cross-test contamination.
afterEach(async () => {
  try {
    await stopAllJobs();
  } catch {}
  resetJobsForTests?.();
  resetBusForTests();
  const jm = getJobManagerForTests?.();
  jm?.resetForTests?.();
});
