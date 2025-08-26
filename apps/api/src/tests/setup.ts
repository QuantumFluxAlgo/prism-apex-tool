// Unified test setup: stop background jobs, reset scheduler & bus after each test
import { afterEach, beforeEach } from 'vitest';
import { resetBusForTests } from '../lib/bus.js';
import { jobManager, stopAllJobs, resetJobsForTests } from '../jobs/jobManager.js';

beforeEach(async () => {
  // Ensure jobs start disabled unless explicitly started in a suite
  process.env.DISABLE_JOBS = '1';
  try {
    await stopAllJobs?.();
  } catch {}
  try {
    resetJobsForTests?.();
  } catch {}
  try {
    jobManager?.reset?.();
  } catch {}
  resetBusForTests();
});

afterEach(async () => {
  try {
    await stopAllJobs?.();
  } catch {}
  try {
    resetJobsForTests?.();
  } catch {}
  try {
    jobManager?.reset?.();
  } catch {}
  resetBusForTests();
});

