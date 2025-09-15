import { jobManager } from '../lib/jobManager.js';

export class JobManager {
  private static inst = jobManager;
  static instance() {
    return JobManager.inst;
  }
}
