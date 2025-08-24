// TODO(Unquarantine Phase X): re-enable real scheduler implementation
export type JobFn = () => Promise<void> | void;
export function registerJob(_name: string, _ms: number, _fn: JobFn) { /* no-op */ }
export function startJobs() { /* no-op */ }
export function listJobStatus(): Array<{ name: string; everyMs: number }> { return []; }
