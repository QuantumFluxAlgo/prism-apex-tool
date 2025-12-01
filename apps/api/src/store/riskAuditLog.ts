// EPIC 7 – Risk Audit Log
// In-memory audit log for:
// - daily risk snapshots
// - lockout decisions (e.g. DAILY_LOCKOUT)
// A DB migration for risk_audit_log exists in deploy/sql, but this module
// intentionally keeps a simple capped in-memory buffer. Wiring to Postgres
// can be added later without breaking the public API.

export type RiskAuditKind = 'snapshot' | 'lockout';

export interface NewRiskAuditEntry {
  kind: RiskAuditKind;
  tradingDay: string; // ISO date (YYYY-MM-DD)
  source: string; // "operator-risk" | "ticketizer" | ...
  reason: string;
  symbol?: string;
  accountId?: string;
  snapshot?: unknown;
}

export interface RiskAuditEntry extends NewRiskAuditEntry {
  id: string;
  createdAt: string;
}

const MAX_ENTRIES = 500;
let entries: RiskAuditEntry[] = [];

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayIsoDate(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generic append helper. Newest-first buffer capped at MAX_ENTRIES.
 */
export function appendRiskAuditEntry(input: NewRiskAuditEntry): RiskAuditEntry {
  const entry: RiskAuditEntry = {
    ...input,
    id: makeId(),
    createdAt: new Date().toISOString(),
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  return entry;
}

/**
 * Convenience helper to record a daily snapshot.
 * Accepts the snapshot DTO shape as `snapshot`, including its own date.
 */
export function recordRiskSnapshot(
  snapshot: unknown,
  opts?: { tradingDay?: string; source?: string; reason?: string; accountId?: string },
): RiskAuditEntry {
  const src = opts?.source ?? 'operator-risk';
  const reason = opts?.reason ?? 'Daily risk snapshot evaluated';
  const day =
    opts?.tradingDay ??
    (typeof snapshot === 'object' && snapshot !== null && 'tradingDay' in snapshot
      ? String((snapshot as any).tradingDay)
      : todayIsoDate());

  return appendRiskAuditEntry({
    kind: 'snapshot',
    tradingDay: day,
    source: src,
    reason,
    accountId: opts?.accountId,
    snapshot,
  });
}

/**
 * Convenience helper to record a daily lockout decision.
 */
export function recordRiskLockout(opts?: {
  tradingDay?: string;
  source?: string;
  reason?: string;
  accountId?: string;
  snapshot?: unknown;
}): RiskAuditEntry {
  const src = opts?.source ?? 'ticketizer';
  const reason = opts?.reason ?? 'Daily risk lockout active: new tickets blocked for the day.';
  const day =
    opts?.tradingDay ??
    (typeof opts?.snapshot === 'object' && opts?.snapshot !== null && 'tradingDay' in (opts?.snapshot as any)
      ? String((opts?.snapshot as any).tradingDay)
      : todayIsoDate());

  return appendRiskAuditEntry({
    kind: 'lockout',
    tradingDay: day,
    source: src,
    reason,
    accountId: opts?.accountId,
    snapshot: opts?.snapshot,
  });
}

/**
 * Retrieve recent audit entries, newest first.
 */
export function getRecentRiskAuditLog(): RiskAuditEntry[] {
  return entries.slice();
}
