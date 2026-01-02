// EPIC 5 – System Alerts
// In-memory alert collector for high-signal events such as:
// - scheduler job failures
// - suspected ingest gaps / metrics failures
// - operator risk daily lockouts
//
// A DB migration for system_alerts exists in deploy/sql, but this module
// intentionally keeps a simple in-memory cache for now. Wiring to Postgres
// can be added later without breaking the public API.

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface NewSystemAlert {
  severity: AlertSeverity;
  source: string;
  code: string;
  message: string;
  jobName?: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
}

export interface SystemAlert extends NewSystemAlert {
  id: string;
  createdAt: string;
}

const MAX_ALERTS = 200;

let alerts: SystemAlert[] = [];

function makeId(): string {
  // Non-cryptographic, stable enough for UI keys.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a new alert and append it to the in-memory buffer.
 * The buffer is capped to MAX_ALERTS most recent entries.
 */
export function createSystemAlert(input: NewSystemAlert): SystemAlert {
  const alert: SystemAlert = {
    ...input,
    id: makeId(),
    createdAt: new Date().toISOString(),
  };

  alerts = [alert, ...alerts].slice(0, MAX_ALERTS);

  return alert;
}

/**
 * Retrieve recent alerts, newest first.
 */
export function getRecentSystemAlerts(): SystemAlert[] {
  return alerts.slice();
}
