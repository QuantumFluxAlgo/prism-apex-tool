const state = Object.create(null);
// test-only: clears in-memory heartbeat state
export function __resetHealth() {
  for (const k of Object.keys(state)) delete state[k];
}
export function setJobBeat(jobName, nowTs = Date.now()) {
  state[jobName] = nowTs;
}
export function getHealth(nowTs = Date.now()) {
  const jobs = {};
  const entries = Object.entries(state);
  for (const [name, ts] of entries) {
    const healthy = nowTs - ts < 10_000;
    jobs[name] = { lastBeatIso: new Date(ts).toISOString(), healthy };
  }
  const overall =
    entries.length > 0 && entries.every(([, ts]) => nowTs - ts < 10_000) ? 'healthy' : 'degraded';
  return { jobs, overall };
}
