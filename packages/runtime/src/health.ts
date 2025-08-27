const beats = new Map<string, number>();

export function setJobBeat(jobName: string) {
  beats.set(jobName, Date.now());
}

export function getHealth() {
  const now = Date.now();
  const jobs: Record<string, { lastBeatIso: string | null; healthy: boolean }> = {};
  for (const [name, ts] of beats.entries()) {
    const lastBeatIso = ts ? new Date(ts).toISOString() : null;
    const healthy = now - ts < 10_000;
    jobs[name] = { lastBeatIso, healthy };
  }
  const overall = Object.values(jobs).every((j) => j.healthy) ? 'healthy' : 'degraded';
  return { jobs, overall } as const;
}
