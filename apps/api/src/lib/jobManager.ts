import { setJobBeat } from '@prism-apex-tool/runtime';
export type StartFn = () => Promise<void> | void;
export type StopFn = () => Promise<void> | void;

type Job = {
  name: string;
  start: StartFn;
  stop: StopFn;
  started: boolean;
  lastBeat?: number;
  beatCount: number;
};

class JobManager {
  private jobs = new Map<string, Job>();
  private started = false;

  register(name: string, start: StartFn, stop: StopFn) {
    const existing = this.jobs.get(name);
    if (existing) return existing; // idempotent
    const job: Job = { name, start, stop, started: false, beatCount: 0 };
    this.jobs.set(name, job);
    try { setJobBeat(name, 0); } catch {}
  
    return job;
  }

  async startAll() {
    if (this.started) return;
    for (const j of this.jobs.values()) {
      if (!j.started) {
        await j.start();
        j.started = true;
        j.lastBeat = Date.now();
        j.beatCount = 0;
        try { setJobBeat(j.name, j.lastBeat); } catch {}
      }
    }
    this.started = true;
  }

  async stopAll() {
    for (const j of this.jobs.values()) {
      if (j.started) {
        try {
          await j.stop();
        } finally {
          j.started = false;
        }
      }
    }
    this.started = false;
  }

  beat(name: string) {
    const j = this.jobs.get(name);
    if (j) {
      j.lastBeat = Date.now();
      j.beatCount++;
      try { setJobBeat(name, j.lastBeat); } catch {}
    }
  }

  snapshot() {
    const out: Record<
      string,
      { registered: boolean; running: boolean; lastBeatTs: string | null; beatCount: number }
    > = {};
    for (const j of this.jobs.values()) {
      out[j.name] = {
        registered: true,
        running: j.started,
        lastBeatTs: j.lastBeat ? new Date(j.lastBeat).toISOString() : null,
        beatCount: j.beatCount,
      };
    }
    return out;
  }

  status() {
    return this.snapshot();
  }

  resetForTests() {
    this.jobs.clear();
    this.started = false;
  }
}

export type JobManagerApi = {
  register: JobManager['register'];
  startAll: JobManager['startAll'];
  stopAll: JobManager['stopAll'];
  beat: JobManager['beat'];
  snapshot: JobManager['snapshot'];
  status: JobManager['status'];
  resetForTests: JobManager['resetForTests'];
};
export const jobManager: JobManagerApi = new JobManager();
