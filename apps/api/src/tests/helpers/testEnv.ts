import { jobManager } from '../../lib/jobManager.js';
import { resetBusForTests } from '../../lib/bus.js';

export function installTestEnv() {
  import('vitest').then(({ afterEach, beforeEach }) => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'test';
      process.env.DISABLE_JOBS = '1';
    });

    afterEach(async () => {
      await jobManager.stopAll();
      jobManager.resetForTests();
      try {
        resetBusForTests();
      } catch {}
    });
  });
}
