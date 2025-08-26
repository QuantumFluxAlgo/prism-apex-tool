import { jobManager } from '../lib/jobManager';

export class JobManager {
  private static inst = jobManager;
  static instance() {
    return JobManager.inst;
  }
}
