export type StartFn = () => Promise<void> | void;
export type StopFn = () => Promise<void> | void;

type Job = { name: string; start: StartFn; stop: StopFn; started: boolean; lastBeat?: number };

class JobManager {
  private jobs = new Map<string, Job>();
  private started = false;

  register(name: string, start: StartFn, stop: StopFn) {
    const existing = this.jobs.get(name);
    if (existing) return existing; // idempotent
    const job: Job = { name, start, stop, started: false };
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
    if (j) j.lastBeat = Date.now();
  }

  status() {
    const out: Array<{ name: string; started: boolean; lastBeat?: string }> = [];
    for (const j of this.jobs.values()) {
      out.push({
        name: j.name,
        started: j.started,
        lastBeat: j.lastBeat ? new Date(j.lastBeat).toISOString() : undefined,
      });
    }
    return out;
  }

  resetForTests() {
    this.jobs.clear();
    this.started = false;
  }
}

export const jobManager = new JobManager();
