export type JobFn = () => Promise<void> | void;

export type JobMeta = {
  name: string;
  everyMs: number;
  fn: JobFn;
  timer?: NodeJS.Timeout;
  running: boolean;
  lastRun?: number;
  lastOk?: boolean;
  lastError?: string;
};

const jobs: JobMeta[] = [];

async function run(job: JobMeta): Promise<void> {
  if (job.running) return;
  job.running = true;
  try {
    await job.fn();
    job.lastOk = true;
    delete job.lastError;
  } catch (err: any) {
    job.lastOk = false;
    job.lastError = err instanceof Error ? err.message : String(err);
  } finally {
    job.lastRun = Date.now();
    job.running = false;
  }
}

export function registerJob(name: string, everyMs: number, fn: JobFn): void {
  if (jobs.find(j => j.name === name)) throw new Error(`Job ${name} already registered`);
  jobs.push({ name, everyMs, fn, running: false });
}

export function startJobs(): void {
  for (const job of jobs) {
    if (job.timer) continue;
    job.timer = setInterval(() => {
      if (!job.running) void run(job);
    }, job.everyMs);
  }
}

export function stopJobs(): void {
  for (const job of jobs) {
    if (job.timer) {
      clearInterval(job.timer);
      delete job.timer;
    }
    job.running = false;
  }
}

export function listJobStatus(): Array<Pick<JobMeta, 'name' | 'everyMs' | 'running' | 'lastRun' | 'lastOk' | 'lastError'>> {
  return jobs.map(({ name, everyMs, running, lastRun, lastOk, lastError }) => ({
    name,
    everyMs,
    running,
    ...(lastRun !== undefined ? { lastRun } : {}),
    ...(lastOk !== undefined ? { lastOk } : {}),
    ...(lastError !== undefined ? { lastError } : {}),
  }));
}

export async function runJobNow(name: string): Promise<boolean> {
  const job = jobs.find(j => j.name === name);
  if (!job || job.running) return false;
  await run(job);
  return true;
}
