export type AlertSeverity = 'info' | 'warning' | 'error';

export interface SystemAlert {
  id: string;
  createdAt: string;
  severity: AlertSeverity;
  source: string;
  code: string;
  message: string;
  jobName?: string;
  entityType?: string;
  entityId?: string;
  // details is intentionally untyped; only surfaced in UI if needed.
  details?: unknown;
}

export interface SystemAlertsResponse {
  alerts: SystemAlert[];
}

function parseJsonSafely<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return Promise.reject(new Error(`Failed to fetch system alerts: ${res.status} ${res.statusText}`));
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch recent system alerts (newest first).
 *
 * GET /api/system/alerts
 */
export async function fetchSystemAlerts(): Promise<SystemAlert[]> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/system/alerts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = await parseJsonSafely<SystemAlertsResponse>(res);
  return body.alerts ?? [];
}
