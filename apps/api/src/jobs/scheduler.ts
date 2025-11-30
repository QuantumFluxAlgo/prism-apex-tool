import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { setJobBeat } from '@prism-apex/runtime';
import { createSessionMetricsService } from './session-metrics/service.js';
import type { EnginePreviewRequest } from '../dto/strategy-engine/index.js';
import { runEnginePreview } from '../services/strategy-engine/index.js';
import { runEngineSessionJob } from './engineRunJob.js';

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
  lastDurationMs?: number;
};

const jobs: JobMeta[] = [];

async function run(job: JobMeta): Promise<void> {
  if (job.running) return;
  job.running = true;
  const started = Date.now();
  try {
    await job.fn();
    job.lastOk = true;
    delete job.lastError;
  } catch (err: any) {
    job.lastOk = false;
    job.lastError = err instanceof Error ? err.message : String(err);
  } finally {
    job.lastRun = Date.now();
    job.lastDurationMs = job.lastRun - started;
    setJobBeat(job.name, job.lastRun);
    job.running = false;
  }
}

export function registerJob(name: string, everyMs: number, fn: JobFn): void {
  if (jobs.find((j) => j.name === name)) throw new Error(`Job ${name} already registered`);
  jobs.push({ name, everyMs, fn, running: false });
  setJobBeat(name, 0);
}

export function startJobs(): void {
  for (const job of jobs) {
    if (job.timer) continue;
    if (!(job.everyMs > 0)) continue;
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

export function listJobStatus(): Array<
  Pick<JobMeta, 'name' | 'everyMs' | 'running' | 'lastRun' | 'lastOk' | 'lastError' | 'lastDurationMs'>
> {
  return jobs.map(({ name, everyMs, running, lastRun, lastOk, lastError, lastDurationMs }) => ({
    name,
    everyMs,
    running,
    ...(lastRun !== undefined ? { lastRun } : {}),
    ...(lastOk !== undefined ? { lastOk } : {}),
    ...(lastError !== undefined ? { lastError } : {}),
    ...(lastDurationMs !== undefined ? { lastDurationMs } : {}),
  }));
}

export async function runJobNow(name: string): Promise<boolean> {
  const job = jobs.find((j) => j.name === name);
  if (!job || job.running) return false;
  await run(job);
  return true;
}

export function resetSchedulerForTests(): void {
  jobs.length = 0;
}

// backward compatibility
export { resetSchedulerForTests as resetJobsForTests };

function parseCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Yahoo ingest job configuration:
 * - INGEST_YAHOO_SYMBOLS: comma-separated Yahoo symbols (e.g. "ES=F,MES=F").
 * - INGEST_JOB_MODE: "backfill" (default) or "gapfill" to choose the ingest CLI.
 * - INGEST_WINDOW_FROM / INGEST_WINDOW_TO: optional ISO timestamps forwarded to the CLI.
 * - INGEST_JOB_INTERVAL_MS: if >0, scheduler will run the job on that interval.
 * - INGEST_RUN_ON_START=true to execute once at API boot.
 */
const INGEST_JOB_NAME = 'yahoo-ingest-manual';
const INGEST_JOB_MODE = (process.env.INGEST_JOB_MODE ?? 'backfill').toLowerCase() === 'gapfill' ? 'gapfill' : 'backfill';
const INGEST_JOB_INTERVAL_MS = Number(process.env.INGEST_JOB_INTERVAL_MS ?? '0');

function resolveSymbols(): string[] {
  const raw = process.env.INGEST_YAHOO_SYMBOLS ?? process.env.YAHOO_SYMBOLS ?? '';
  return parseCsv(raw);
}

async function spawnIngestCli(mode: 'backfill' | 'gapfill', env: NodeJS.ProcessEnv): Promise<void> {
  const args = ['--filter', '@prism-apex/ingest', mode];
  const options: SpawnOptionsWithoutStdio = {
    env,
    stdio: 'inherit',
  };
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', args, options);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pnpm ${mode} exited with code ${code}`))));
    child.on('error', reject);
  });
}

async function runYahooIngestJob(): Promise<void> {
  const symbols = resolveSymbols();
  if (!symbols.length) {
    console.info(`[${INGEST_JOB_NAME}] skipped: INGEST_YAHOO_SYMBOLS not set`);
    return;
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    YAHOO_SYMBOLS: symbols.join(','),
  };
  const windowFrom = process.env.INGEST_WINDOW_FROM;
  const windowTo = process.env.INGEST_WINDOW_TO;
  if (windowFrom) env.WINDOW_FROM = windowFrom;
  if (windowTo) env.WINDOW_TO = windowTo;

  const started = Date.now();
  console.info(
    `[${INGEST_JOB_NAME}] starting ${INGEST_JOB_MODE} for symbols=${symbols.join(',')} window=${windowFrom ?? 'latest'}→${windowTo ?? 'latest'}`,
  );
  try {
    await spawnIngestCli(INGEST_JOB_MODE, env);
    const duration = Date.now() - started;
    console.info(`[${INGEST_JOB_NAME}] completed in ${duration}ms`);
  } catch (error) {
    console.error(`[${INGEST_JOB_NAME}] failed`, error);
    throw error;
  }
}

registerJob(INGEST_JOB_NAME, INGEST_JOB_INTERVAL_MS, runYahooIngestJob);

const runIngestOnStart = (process.env.INGEST_RUN_ON_START ?? '').toLowerCase() === 'true';
if (runIngestOnStart) {
  void runJobNow(INGEST_JOB_NAME);
}

const SESSION_METRICS_JOB_NAME = 'session-metrics-manual';
const SESSION_METRICS_JOB_INTERVAL_MS = Number(process.env.SESSION_METRICS_JOB_INTERVAL_MS ?? '0');

async function runSessionMetricsJob(): Promise<void> {
  const symbols = parseCsv(process.env.SESSION_METRICS_JOB_SYMBOLS ?? process.env.INGEST_YAHOO_SYMBOLS ?? '');
  const sessionDate = process.env.SESSION_METRICS_JOB_SESSION_DATE;
  if (!symbols.length || !sessionDate) {
    console.info(
      `[${SESSION_METRICS_JOB_NAME}] skipped: SESSION_METRICS_JOB_SYMBOLS or SESSION_METRICS_JOB_SESSION_DATE missing`,
    );
    return;
  }
  const service = createSessionMetricsService();
  const started = Date.now();
  console.info(`[${SESSION_METRICS_JOB_NAME}] computing metrics for symbols=${symbols.join(',')} session=${sessionDate}`);
  for (const symbol of symbols) {
    await service.getForSymbolSession({ symbol, sessionDate });
  }
  console.info(`[${SESSION_METRICS_JOB_NAME}] completed in ${Date.now() - started}ms`);
}

registerJob(SESSION_METRICS_JOB_NAME, SESSION_METRICS_JOB_INTERVAL_MS, runSessionMetricsJob);

const STRATEGIES_JOB_NAME = 'strategies-manual';
const STRATEGIES_JOB_INTERVAL_MS = Number(process.env.STRATEGIES_JOB_INTERVAL_MS ?? '0');

async function runStrategiesJob(): Promise<void> {
  const strategies = parseCsv(process.env.STRATEGIES_JOB_STRATEGIES ?? '');
  const symbols = parseCsv(process.env.STRATEGIES_JOB_SYMBOLS ?? process.env.INGEST_YAHOO_SYMBOLS ?? '');
  const sessionDate = process.env.STRATEGIES_JOB_SESSION_DATE;
  if (!strategies.length || !symbols.length || !sessionDate) {
    console.info(
      `[${STRATEGIES_JOB_NAME}] skipped: STRATEGIES_JOB_STRATEGIES, STRATEGIES_JOB_SYMBOLS, or STRATEGIES_JOB_SESSION_DATE missing`,
    );
    return;
  }
  const started = Date.now();
  console.info(
    `[${STRATEGIES_JOB_NAME}] running strategies=${strategies.join(',')} symbols=${symbols.join(',')} session=${sessionDate}`,
  );
  for (const strategy of strategies) {
    for (const symbol of symbols) {
      const request: EnginePreviewRequest = { strategy: strategy as EnginePreviewRequest['strategy'], symbol, sessionDate };
      const preview = await runEnginePreview(request);
      const signals = Array.isArray(preview?.signals) ? preview.signals.length : 0;
      console.info(`[${STRATEGIES_JOB_NAME}] ${strategy} ${symbol} signals=${signals}`);
    }
  }
  console.info(`[${STRATEGIES_JOB_NAME}] completed in ${Date.now() - started}ms`);
}

registerJob(STRATEGIES_JOB_NAME, STRATEGIES_JOB_INTERVAL_MS, runStrategiesJob);

const TICKETIZER_JOB_NAME = 'ticketizer-manual';
const TICKETIZER_JOB_INTERVAL_MS = Number(process.env.TICKETIZER_JOB_INTERVAL_MS ?? '0');

async function runTicketizerJob(): Promise<void> {
  const strategies = parseCsv(
    process.env.TICKETIZER_JOB_STRATEGIES ?? process.env.STRATEGIES_JOB_STRATEGIES ?? '',
  );
  const symbols = parseCsv(
    process.env.TICKETIZER_JOB_SYMBOLS ?? process.env.STRATEGIES_JOB_SYMBOLS ?? process.env.INGEST_YAHOO_SYMBOLS ?? '',
  );
  const sessionDate = process.env.TICKETIZER_JOB_SESSION_DATE ?? process.env.STRATEGIES_JOB_SESSION_DATE;
  if (!strategies.length || !symbols.length || !sessionDate) {
    console.info(
      `[${TICKETIZER_JOB_NAME}] skipped: strategy, symbol, or sessionDate env vars missing`,
    );
    return;
  }
  const started = Date.now();
  console.info(
    `[${TICKETIZER_JOB_NAME}] running ticketizer pipeline strategies=${strategies.join(',')} symbols=${symbols.join(',')} session=${sessionDate}`,
  );
  for (const strategy of strategies) {
    for (const symbol of symbols) {
      await runEngineSessionJob({
        strategy: strategy as EnginePreviewRequest['strategy'],
        symbol,
        sessionDate,
        meta: { source: TICKETIZER_JOB_NAME },
      });
    }
  }
  console.info(`[${TICKETIZER_JOB_NAME}] completed in ${Date.now() - started}ms`);
}

registerJob(TICKETIZER_JOB_NAME, TICKETIZER_JOB_INTERVAL_MS, runTicketizerJob);

export async function runPipelineOnceForMaintenance(): Promise<void> {
  await runJobNow(INGEST_JOB_NAME);
  await runJobNow(SESSION_METRICS_JOB_NAME);
  await runJobNow(STRATEGIES_JOB_NAME);
  await runJobNow(TICKETIZER_JOB_NAME);
}
