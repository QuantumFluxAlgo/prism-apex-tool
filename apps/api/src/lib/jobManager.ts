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

export const jobManager = new JobManager();
