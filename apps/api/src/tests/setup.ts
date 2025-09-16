import { afterEach, beforeEach } from 'vitest';
import { resetBusForTests } from '@prism-apex/app-api/lib/bus.js';
import { jobManager as JobManager } from '@prism-apex/app-api/lib/jobManager.js';
import { resetSchedulerForTests } from '@prism-apex/app-api/jobs/scheduler.js';

// Stop all jobs & clear listeners around tests to avoid cross-suite bleed.
beforeEach(() => {
  // nothing: suites start jobs explicitly if they need them
});

afterEach(async () => {
  try {
    await JobManager.stopAll();
  } catch {}
  resetSchedulerForTests?.();
  resetBusForTests?.();
});
