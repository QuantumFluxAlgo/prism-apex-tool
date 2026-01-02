export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  details?: Record<string, unknown>;
}

export function getLiveness(): HealthStatus {
  return { status: 'ok' };
}

export function getReadiness(): HealthStatus {
  return { status: 'ok' };
}
