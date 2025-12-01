import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { fetchJson } from '../lib/apiBase';
import {
  fetchJobStatus,
  fetchOperatorConfig,
  updateOperatorConfig,
  type JobStatusDto,
  type OperatorConfigDto,
} from '../lib/api';
import type { DailyRiskSnapshotDto } from '../lib/operatorRisk';
import { fetchDailyRiskSnapshot } from '../lib/operatorRisk';
import { SystemTelemetryPanel } from '../components/SystemTelemetryPanel';
import { RiskAuditPanel } from '../components/RiskAuditPanel';

type ServiceKey = 'db' | 'api' | 'yahoo' | 'tickets_cron' | 'gapfill_cron';
type HealthState = 'green' | 'amber' | 'red' | 'grey' | string | undefined;

interface StatusPayload {
  services?: Record<string, HealthState>;
  symbols?: Array<{
    symbol?: string | null;
    last_utc?: string | null;
    age_ms?: number | null;
    health?: HealthState;
  }>;
  session?: { is_open?: boolean | null };
}

const SERVICE_CONFIG: Array<{ key: ServiceKey; label: string; detail: string }> = [
  { key: 'db', label: 'Database', detail: 'Postgres connectivity + latest bar times' },
  { key: 'api', label: 'API', detail: 'Fastify process + auth middleware' },
  { key: 'yahoo', label: 'Yahoo Ingress', detail: 'Market data fetcher (ingress service)' },
  { key: 'tickets_cron', label: 'Tickets Cron', detail: 'Open ticket refresh (60s)' },
  { key: 'gapfill_cron', label: 'Gapfill Cron', detail: 'Backfills missing bars (daily)' },
];

const STATUS_ENDPOINT = '/api/status';
const REFRESH_INTERVAL_MS = 15_000;

function dotClass(health: HealthState) {
  const state = (health ?? 'grey') as string;
  return `status-dot status-${state}`;
}

function describeHealth(health: HealthState) {
  switch (health) {
    case 'green':
      return 'Running';
    case 'amber':
      return 'Limited / delayed';
    case 'red':
      return 'Problems fetching';
    case 'grey':
    case undefined:
    case null:
      return 'Backoff';
    default:
      return String(health);
  }
}

function formatIso(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const normalized = date.toISOString();
  return normalized.replace('T', ' ').replace('Z', ' UTC');
}

function formatAge(ageMs: number | null | undefined) {
  if (ageMs === null || ageMs === undefined || Number.isNaN(Number(ageMs))) return '—';
  const totalSeconds = Math.max(0, Math.floor(Number(ageMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

function formatIntervalMs(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return 'Manual trigger';
  const seconds = Math.floor(value / 1000);
  if (seconds === 0) return `${value}ms`;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatDurationMs(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '—';
  if (value < 1000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}m`;
}

function describeJobStatus(job: JobStatusDto): { label: string; health: HealthState } {
  if (job.running) return { label: 'Running', health: 'amber' };
  if (job.lastOk === true) return { label: 'OK', health: 'green' };
  if (job.lastOk === false || typeof job.lastError === 'string') return { label: 'Failing', health: 'red' };
  if (!job.lastRunUtc) return { label: 'Pending', health: 'grey' };
  return { label: 'Idle', health: 'grey' };
}

function formatNumberOrDash(value: number | null | undefined, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not set';
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function formatSigned(value: number, suffix = '') {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export default function StatusPage() {
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [jobStatuses, setJobStatuses] = useState<JobStatusDto[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);

  const [operatorConfig, setOperatorConfig] = useState<OperatorConfigDto | null>(null);
  const [riskForm, setRiskForm] = useState({ dailyStartingBalance: '', maxDailyDrawdownPct: '' });
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [riskSavedAt, setRiskSavedAt] = useState<string | null>(null);

  const [riskSnapshot, setRiskSnapshot] = useState<DailyRiskSnapshotDto | null>(null);
  const [riskSnapshotError, setRiskSnapshotError] = useState<string | null>(null);
  const [isRiskSnapshotLoading, setIsRiskSnapshotLoading] = useState(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsRefreshing(true);
    setJobsLoading(true);
    const [statusResult, jobsResult] = await Promise.allSettled([
      fetchJson(STATUS_ENDPOINT) as Promise<StatusPayload>,
      fetchJobStatus(),
    ]);
    if (!mountedRef.current) return;

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value);
      setError(null);
      setLastUpdated(new Date());
    } else {
      const reason = statusResult.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? 'Unknown error');
      setError(`Failed to load status: ${message}`);
    }

    if (jobsResult.status === 'fulfilled') {
      setJobStatuses(jobsResult.value);
      setJobsError(null);
    } else {
      const reason = jobsResult.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? 'Unknown error');
      setJobsError(`Failed to load jobs: ${message}`);
    }

    setJobsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    async function loadOperatorConfig() {
      setRiskLoading(true);
      try {
        const cfg = await fetchOperatorConfig();
        if (cancelled) return;
        setOperatorConfig(cfg);
        setRiskForm({
          dailyStartingBalance: cfg.dailyStartingBalance !== null ? String(cfg.dailyStartingBalance) : '',
          maxDailyDrawdownPct: cfg.maxDailyDrawdownPct !== null ? String(cfg.maxDailyDrawdownPct) : '',
        });
        setRiskError(null);
      } catch (err) {
        if (cancelled) return;
        setRiskError(err instanceof Error ? err.message : 'Failed to load operator config');
      } finally {
        if (!cancelled) setRiskLoading(false);
      }
    }
    loadOperatorConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRiskSnapshot() {
      setIsRiskSnapshotLoading(true);
      setRiskSnapshotError(null);
      try {
        const snapshot = await fetchDailyRiskSnapshot();
        if (cancelled) return;
        setRiskSnapshot(snapshot);
      } catch (err) {
        if (cancelled) return;
        setRiskSnapshotError(err instanceof Error ? err.message : 'Failed to load daily risk snapshot');
      } finally {
        if (!cancelled) setIsRiskSnapshotLoading(false);
      }
    }
    loadRiskSnapshot();
    return () => {
      cancelled = true;
    };
  }, []);

  const services = useMemo(
    () =>
      SERVICE_CONFIG.map((service) => ({
        ...service,
        health: status?.services?.[service.key],
      })),
    [status],
  );
  const jobRows = useMemo(
    () =>
      jobStatuses.map((job) => {
        const classification = describeJobStatus(job);
        return {
          ...job,
          scheduleLabel: formatIntervalMs(job.everyMs),
          lastRunLabel: job.lastRunUtc ? formatIso(job.lastRunUtc) : 'Never run',
          durationLabel: formatDurationMs(job.lastDurationMs),
          classification,
          note: job.lastError
            ? job.lastError
            : classification.label === 'Pending'
            ? 'Awaiting first run'
            : classification.label === 'Failing'
            ? 'Check logs'
            : classification.label === 'Running'
            ? 'Executing now'
            : 'OK',
        };
      }),
    [jobStatuses],
  );

  const symbols = status?.symbols ?? [];
  const relaxed = Boolean(status?.session && status.session.is_open === false);

  async function handleRiskSave() {
    setRiskError(null);
    let dailyStartingBalance: number | null = null;
    let maxDailyDrawdownPct: number | null = null;
    if (riskForm.dailyStartingBalance.trim()) {
      const parsed = Number(riskForm.dailyStartingBalance);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setRiskError('Daily starting balance must be a positive number.');
        return;
      }
      dailyStartingBalance = parsed;
    }
    if (riskForm.maxDailyDrawdownPct.trim()) {
      const parsed = Number(riskForm.maxDailyDrawdownPct);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) {
        setRiskError('Max daily drawdown % must be between 0 and 100.');
        return;
      }
      maxDailyDrawdownPct = parsed;
    }
    setRiskLoading(true);
    try {
      const updated = await updateOperatorConfig({
        dailyStartingBalance: riskForm.dailyStartingBalance.trim() ? dailyStartingBalance : null,
        maxDailyDrawdownPct: riskForm.maxDailyDrawdownPct.trim() ? maxDailyDrawdownPct : null,
      });
      setOperatorConfig(updated);
      setRiskForm({
        dailyStartingBalance: updated.dailyStartingBalance !== null ? String(updated.dailyStartingBalance) : '',
        maxDailyDrawdownPct: updated.maxDailyDrawdownPct !== null ? String(updated.maxDailyDrawdownPct) : '',
      });
      setRiskSavedAt(new Date().toISOString());
      setRiskError(null);
    } catch (err) {
      setRiskError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setRiskLoading(false);
    }
  }

  const riskPill = (() => {
    if (isRiskSnapshotLoading) {
      return (
        <span className="status-pill">
          <span className={dotClass('grey')} aria-hidden="true" />Loading…
        </span>
      );
    }
    if (riskSnapshotError) {
      return (
        <span className="status-pill">
          <span className={dotClass('amber')} aria-hidden="true" />Snapshot error
        </span>
      );
    }
    if (!riskSnapshot) {
      return (
        <span className="status-pill">
          <span className={dotClass('grey')} aria-hidden="true" />No snapshot
        </span>
      );
    }
    if (riskSnapshot.isLockedOut === true) {
      return (
        <span className="status-pill">
          <span className={dotClass('red')} aria-hidden="true" />Risk lockout
        </span>
      );
    }
    if (riskSnapshot.isLockedOut === false && riskSnapshot.remainingRiskCapacity !== null) {
      return (
        <span className="status-pill">
          <span className={dotClass('green')} aria-hidden="true" />
          Remaining: {formatSigned(riskSnapshot.remainingRiskCapacity)}
        </span>
      );
    }
    return (
      <span className="status-pill">
        <span className={dotClass('grey')} aria-hidden="true" />Risk limits not configured
      </span>
    );
  })();

  return (
    <div className="dashboard-stack status-page">
      <Card>
        <CardBody className="stack">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.015em' }}>System Status</h2>
            <p className="status-detail">
              Live view of cluster health and latest symbol ticks. Auto-updates every 15 seconds.
            </p>
          </div>
          <div className="status-meta">
            {lastUpdated && (
              <span>Last update {lastUpdated.toLocaleTimeString(undefined, { hour12: false })}</span>
            )}
            {relaxed && <span>Session paused — symbol ages use prior close.</span>}
            <Button size="sm" variant="ghost" type="button" disabled={isRefreshing} onClick={refresh}>
              {isRefreshing ? 'Refreshing…' : 'Refresh now'}
            </Button>
          </div>
        </CardBody>
      </Card>
      {error && <div className="status-error">{error}</div>}

      <div className="status-grid">
        {services.map(({ key, label, detail, health }) => (
          <Card key={key}>
            <div className="status-card__header">
              <div className="status-card__identity">
                <span className={dotClass(health)} aria-hidden="true" />
                <strong>{label}</strong>
              </div>
              <span className="status-pill">
                <span className={dotClass(health)} aria-hidden="true" />
                {describeHealth(health)}
              </span>
            </div>
            {detail && <p className="status-detail">{detail}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <strong>Scheduler Jobs</strong>
            {jobsLoading ? <span className="text-xs text-slate-400">Updating…</span> : null}
          </div>
        </CardHeader>
        <CardBody>
          {jobsError && <p className="status-error">{jobsError}</p>}
          {!jobsLoading && !jobRows.length && !jobsError ? (
            <p className="status-detail">No scheduler jobs registered.</p>
          ) : null}
          {jobsLoading && !jobRows.length ? <p className="status-detail">Loading jobs…</p> : null}
          {jobRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-2 pr-3">Job</th>
                    <th className="py-2 pr-3">Schedule</th>
                    <th className="py-2 pr-3">Last run</th>
                    <th className="py-2 pr-3">Last duration</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((job) => (
                    <tr key={job.name} className="border-t border-slate-800/40">
                      <td className="py-2 pr-3 font-semibold text-white">{job.name}</td>
                      <td className="py-2 pr-3 text-slate-300">{job.scheduleLabel}</td>
                      <td className="py-2 pr-3 text-slate-300">{job.lastRunLabel}</td>
                      <td className="py-2 pr-3 font-mono text-slate-100">{job.durationLabel}</td>
                      <td className="py-2 pr-3">
                        <span className="status-pill">
                          <span className={dotClass(job.classification.health)} aria-hidden="true" />
                          {job.classification.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{job.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <SystemTelemetryPanel />
      <RiskAuditPanel />

      <Card>
        <CardHeader>
          <div>
            <strong>Daily Risk Settings</strong>
            <p className="status-detail">Used to calculate daily drawdown and sizing guardrails.</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {riskError && <p className="text-sm text-amber-300">{riskError}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Daily starting balance</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={riskForm.dailyStartingBalance}
                onChange={(event) =>
                  setRiskForm((prev) => ({ ...prev, dailyStartingBalance: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">Max daily drawdown %</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={riskForm.maxDailyDrawdownPct}
                onChange={(event) =>
                  setRiskForm((prev) => ({ ...prev, maxDailyDrawdownPct: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <div>
              Starting balance today:{' '}
              <span className="font-mono text-white">
                {formatNumberOrDash(operatorConfig?.dailyStartingBalance)}
              </span>
            </div>
            <div>
              Max drawdown:{' '}
              <span className="font-mono text-white">
                {formatNumberOrDash(operatorConfig?.maxDailyDrawdownPct, '%')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={riskLoading} onClick={handleRiskSave}>
              {riskLoading ? 'Saving…' : 'Save'}
            </Button>
            {(operatorConfig?.updatedAtUtc || riskSavedAt) && (
              <span className="text-xs text-slate-500">
                Last updated {formatIso(riskSavedAt ?? operatorConfig?.updatedAtUtc ?? null)}
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Daily risk snapshot</p>
              {riskPill}
            </div>
            {isRiskSnapshotLoading ? (
              <p className="text-sm text-slate-500">Loading daily risk snapshot…</p>
            ) : riskSnapshotError ? (
              <p className="text-sm text-rose-300">{riskSnapshotError}</p>
            ) : riskSnapshot ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Realised PnL</p>
                  <p className={riskSnapshot.realisedPnL >= 0 ? 'text-emerald-300 font-mono' : 'text-rose-300 font-mono'}>
                    {formatSigned(riskSnapshot.realisedPnL)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Open risk</p>
                  <p className="font-mono text-white">{formatSigned(riskSnapshot.openRisk)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Remaining capacity</p>
                  <p className="font-mono text-white">
                    {riskSnapshot.remainingRiskCapacity !== null
                      ? formatSigned(riskSnapshot.remainingRiskCapacity)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Snapshot unavailable.</p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <strong>Symbols</strong>
        </CardHeader>
        <CardBody>
          {symbols.length === 0 ? (
            <p className="status-detail">No symbol data yet.</p>
          ) : (
            <div className="symbol-grid">
              {symbols.map((entry, index) => {
                const health = entry.health ?? 'grey';
                const key = entry.symbol ?? `symbol-${index}`;
                return (
                  <div className="symbol-card" key={key}>
                    <div className="symbol-card__header">
                      <span className="symbol-card__symbol">{entry.symbol ?? '—'}</span>
                      <span className="status-pill">
                        <span className={dotClass(health)} aria-hidden="true" />
                        {describeHealth(health)}
                      </span>
                    </div>
                    <div className="symbol-card__meta">
                      <div>
                        <span className="label">Last bar</span>
                        <span className="value">{formatIso(entry.last_utc)}</span>
                      </div>
                      <div>
                        <span className="label">Age</span>
                        <span className="value">
                          {entry.last_utc ? formatAge(entry.age_ms) : relaxed ? 'paused' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
