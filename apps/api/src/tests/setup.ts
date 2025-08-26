import { resetBusForTests } from '../lib/bus';
import { JobManager } from '../jobs/manager';
import { resetSchedulerForTests } from '../jobs/scheduler';

// Ensure jobs never auto-start during unit tests
process.env.DISABLE_JOBS = '1';
process.env.NODE_ENV = 'test';

// Run before each test file
beforeEach(() => {
  JobManager.instance().stopAll();
  JobManager.instance().resetForTests?.();
  resetSchedulerForTests?.();
  resetBusForTests?.();
});
