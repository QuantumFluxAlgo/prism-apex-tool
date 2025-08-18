/**
 * Minimal job scheduler for Prism Apex Tool.
 * - register(name, everyMs, fn): schedules setInterval after server start.
 * - maintains last run/ok/error for /jobs/status.
 */
type JobFn = () => Promise<void> | void;

export type JobStatus = {
  name: string;
  everyMs: number;
  lastRun?: string;
  lastOk?: string;
  lastError?: string;
  running: boolean;
};

const jobs: Record<string, { everyMs: number; fn: JobFn; status: JobStatus; timer?: NodeJS.Timeout }> = {};

export function registerJob(name: string, everyMs: number, fn: JobFn) {
  if (jobs[name]) return;
  jobs[name] = { everyMs, fn, status: { name, everyMs, running: false } };
}

export function startJobs() {
  Object.entries(jobs).forEach(([name, j]) => {
    if (j.timer) return;
    const tick = async () => {
      if (j.status.running) return;
      j.status.running = true;
      j.status.lastRun = new Date().toISOString();
      try {
        await Promise.resolve(j.fn());
        j.status.lastOk = new Date().toISOString();
        j.status.lastError = undefined;
      } catch (e: any) {
        j.status.lastError = e?.message || String(e);
      } finally {
        j.status.running = false;
      }
    };
    setTimeout(tick, Math.min(1000, j.everyMs));
    j.timer = setInterval(tick, j.everyMs);
  });
}

export function listJobStatus(): JobStatus[] {
  return Object.values(jobs).map(j => j.status);
}

export function stopJobs() {
  Object.values(jobs).forEach(j => j.timer && clearInterval(j.timer));
}
