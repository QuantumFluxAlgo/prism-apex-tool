type JobStatus = { lastBeatIso: string; healthy: boolean };

const state: Record<string, number> = Object.create(null);
const JOB_HEALTH_WINDOW_MS = (() => {
  const raw = Number(process.env.JOB_HEALTH_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 600_000;
})();

// test-only: clears in-memory heartbeat state
export function __resetHealth(): void {
  for (const k of Object.keys(state)) delete state[k];
}

export function setJobBeat(jobName: string, nowTs: number = Date.now()): void {
  state[jobName] = nowTs;
}

export function getHealth(nowTs: number = Date.now()): {
  jobs: Record<string, JobStatus>;
  overall: 'healthy' | 'degraded';
} {
  const jobs: Record<string, JobStatus> = {};
  const entries = Object.entries(state);
  for (const [name, ts] of entries) {
    const healthy = nowTs - ts < JOB_HEALTH_WINDOW_MS;
    jobs[name] = { lastBeatIso: new Date(ts).toISOString(), healthy };
  }
  const overall: 'healthy' | 'degraded' =
    entries.length > 0 && entries.every(([, ts]) => nowTs - ts < JOB_HEALTH_WINDOW_MS) ? 'healthy' : 'degraded';
  return { jobs, overall };
}
