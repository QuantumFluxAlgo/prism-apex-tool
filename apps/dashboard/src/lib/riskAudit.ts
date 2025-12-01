export type RiskAuditKind = 'snapshot' | 'lockout';

export interface RiskAuditEntry {
  id: string;
  createdAt: string;
  kind: RiskAuditKind;
  tradingDay: string;
  source: string;
  reason: string;
  symbol?: string;
  accountId?: string;
  snapshot?: unknown;
}

export interface RiskAuditResponse {
  entries: RiskAuditEntry[];
}

function parseJsonSafely<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return Promise.reject(new Error(`Failed to fetch risk audit log: ${res.status} ${res.statusText}`));
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch recent risk audit entries (snapshots + lockouts), newest first.
 *
 * GET /api/operator-risk/audit
 */
export async function fetchRiskAuditLog(): Promise<RiskAuditEntry[]> {
  const res = await fetch('/api/operator-risk/audit', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = await parseJsonSafely<RiskAuditResponse>(res);
  return body.entries ?? [];
}
