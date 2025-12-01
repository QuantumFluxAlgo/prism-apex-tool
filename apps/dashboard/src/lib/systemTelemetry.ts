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

export interface SystemTelemetryJobsResponse {
  jobs: JobTelemetrySnapshot[];
}

function parseJsonSafely<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return Promise.reject(
      new Error(`Failed to fetch system telemetry: ${res.status} ${res.statusText}`),
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch scheduler/system telemetry from the API.
 *
 * GET /api/system/telemetry
 */
export async function fetchSystemTelemetry(): Promise<JobTelemetrySnapshot[]> {
  const res = await fetch('/api/system/telemetry', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = await parseJsonSafely<SystemTelemetryJobsResponse>(res);
  return body.jobs ?? [];
}
