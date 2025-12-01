// EPIC 9 – System Telemetry
// In-memory telemetry store for scheduler jobs.
// NOTE: This is intentionally simple and reversible; no persistence yet.

export interface JobTelemetrySnapshot {
  jobName: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  avgDurationMs: number | null;
  runCount: number;
  errorCount: number;
  ingestGaps: number;
  metricsFailures: number;
}

type JobTelemetryMap = Record<string, JobTelemetrySnapshot>;

const telemetryByJob: JobTelemetryMap = Object.create(null);

/**
 * Outcome of a single job run.
 */
export interface JobRunOutcome {
  ok: boolean;
  /**
   * Optional explicit ingest gap count (if the job reports it).
   * If not provided, we infer from job name on failure.
   */
  ingestGapCount?: number;
  /**
   * Optional explicit metrics failure count.
   * If not provided, we infer from job name on failure.
   */
  metricsFailureCount?: number;
}

function ensureJob(jobName: string): JobTelemetrySnapshot {
  const existing = telemetryByJob[jobName];
  if (existing) {
    return existing;
  }

  const snapshot: JobTelemetrySnapshot = {
    jobName,
    lastRunAt: null,
    lastDurationMs: null,
    avgDurationMs: null,
    runCount: 0,
    errorCount: 0,
    ingestGaps: 0,
    metricsFailures: 0,
  };

  telemetryByJob[jobName] = snapshot;
  return snapshot;
}

/**
 * Record the outcome of a single job run.
 */
export function recordJobRun(
  jobName: string,
  durationMs: number,
  outcome: JobRunOutcome,
): void {
  const snap = ensureJob(jobName);

  const nowIso = new Date().toISOString();
  snap.lastRunAt = nowIso;
  snap.lastDurationMs = durationMs;

  const nextRunCount = snap.runCount + 1;
  // Simple incremental average on duration.
  if (snap.avgDurationMs == null) {
    snap.avgDurationMs = durationMs;
  } else {
    snap.avgDurationMs =
      (snap.avgDurationMs * snap.runCount + durationMs) / nextRunCount;
  }

  snap.runCount = nextRunCount;

  if (!outcome.ok) {
    snap.errorCount += 1;

    // Fallback inference if no explicit counts provided.
    if (outcome.ingestGapCount == null && jobName.includes("yahoo")) {
      snap.ingestGaps += 1;
    }

    if (
      outcome.metricsFailureCount == null &&
      jobName.includes("session-metrics")
    ) {
      snap.metricsFailures += 1;
    }
  }

  if (outcome.ingestGapCount != null && outcome.ingestGapCount > 0) {
    snap.ingestGaps += outcome.ingestGapCount;
  }

  if (
    outcome.metricsFailureCount != null && outcome.metricsFailureCount > 0
  ) {
    snap.metricsFailures += outcome.metricsFailureCount;
  }
}

/**
 * Return the current telemetry snapshot for all jobs.
 */
export function getSystemTelemetry(): JobTelemetrySnapshot[] {
  return Object.values(telemetryByJob);
}
