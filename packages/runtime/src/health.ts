type JobStatus = { lastBeatIso: string; healthy: boolean };

const state: Record<string, number> = Object.create(null);

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
    const healthy = nowTs - ts < 10_000;
    jobs[name] = { lastBeatIso: new Date(ts).toISOString(), healthy };
  }
  const overall: 'healthy' | 'degraded' =
    entries.length > 0 && entries.every(([, ts]) => nowTs - ts < 10_000) ? 'healthy' : 'degraded';
  return { jobs, overall };
}
