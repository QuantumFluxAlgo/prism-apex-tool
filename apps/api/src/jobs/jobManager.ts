import { jobManager } from '../lib/jobManager';
import {
  startJobs as schedulerStartJobs,
  stopJobs as schedulerStopJobs,
  resetJobsForTests,
} from './scheduler';

export async function startJobs() {
  await jobManager.startAll();
  schedulerStartJobs();
}

export async function stopAllJobs() {
  schedulerStopJobs();
  await jobManager.stopAll();
}

export { jobManager };
export { resetJobsForTests };
