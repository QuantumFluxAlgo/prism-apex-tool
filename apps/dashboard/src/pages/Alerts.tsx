import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import {
  fetchYahooHealth,
  fetchSystemJobs,
  fetchSystemTelemetry,
  type YahooHealthResponse,
  type SystemJobStatus,
  type SystemTelemetrySnapshot,
} from '../lib/api';
import { logContractError, logPageLoad } from '../lib/contractTelemetry';
import {
  deriveIngestState,
  formatLag,
  getWorstLagSeconds,
} from '../lib/ingestState';

type Severity = 'info' | 'warning' | 'critical';
type AlertState = 'open' | 'acknowledged' | 'cleared';
type AlertSource = 'risk' | 'system' | 'engine' | 'infra' | 'external';

export interface AlertRow {
  id: string;
  severity: Severity;
  state: AlertState;
  source: AlertSource;
  title: string;
  message: string;
  createdAt: string;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const STATE_LABEL: Record<AlertState, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  cleared: 'Cleared',
};

const SOURCE_LABEL: Record<AlertSource, string> = {
  risk: 'Risk',
  system: 'System',
  engine: 'Engine',
  infra: 'Infra',
  external: 'External',
};

type JobHealth = {
  missing: boolean;
  stale: boolean;
  lastOk: boolean;
  lastRunUtc: string | null;
  everyMs: number | null;
};

function analyzeSystemJob(job?: SystemJobStatus | null): JobHealth {
  if (!job || !job.name) {
    return {
      missing: true,
      stale: true,
      lastOk: false,
      lastRunUtc: null,
      everyMs: null,
    };
  }
  const everyMs =
    job.everyMs ?? job.intervalMs ?? job.interval_ms ?? 60_000;
  const lastRun =
    job.lastRunUtc ??
    job.lastRunAt ??
    job.lastRunAtUtc ??
    job.last_run_utc ??
    null;
  const lastRunMs = lastRun ? Date.parse(lastRun) : NaN;
  const threshold = Math.max(everyMs * 3, 5 * 60 * 1000);
  const stale =
    !lastRun ||
    !Number.isFinite(lastRunMs) ||
    Date.now() - Number(lastRunMs) > threshold;
  const lastOk = job.lastOk ?? job.ok ?? true;
  return {
    missing: false,
    stale,
    lastOk,
    lastRunUtc: lastRun,
    everyMs,
  };
}

function describeJobHealth(name: string, health: JobHealth): string {
  const interval =
    health.everyMs && Number.isFinite(health.everyMs)
      ? `${Math.round(health.everyMs / 1000)}s`
      : '—';
  return `${name}: lastRun=${health.lastRunUtc ?? '—'} · lastOk=${
    health.lastOk ? 'true' : 'false'
  } · stale=${health.stale ? 'true' : 'false'} · interval=${interval}`;
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [stateFilter, setStateFilter] = useState<'all' | AlertState>('all');
  const [health, setHealth] = useState<YahooHealthResponse | null>(null);
  const [jobs, setJobs] = useState<SystemJobStatus[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetrySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logPageLoad('Alerts');
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [healthRes, jobsRes, telemetryRes] = await Promise.all([
          fetchYahooHealth(),
          fetchSystemJobs(),
          fetchSystemTelemetry(),
        ]);
        if (cancelled) return;
        setHealth(healthRes ?? null);
        setJobs(Array.isArray(jobsRes) ? jobsRes : []);
        setTelemetry(Array.isArray(telemetryRes) ? telemetryRes : []);
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load alerts');
          logContractError({
            pageId: 'Alerts',
            endpoint: 'alerts.loadBatch',
            error: err,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ingestRows = useMemo(
    () => health?.rows ?? [],
    [health],
  );
  const ingestState = useMemo(
    () => deriveIngestState(ingestRows),
    [ingestRows],
  );
  const worstLagSeconds = useMemo(
    () => getWorstLagSeconds(ingestRows),
    [ingestRows],
  );
  const jobMap = useMemo(() => {
    const map = new Map<string, SystemJobStatus>();
    for (const job of jobs) {
      if (job.name) {
        map.set(job.name.toLowerCase(), job);
      }
    }
    return map;
  }, [jobs]);
  const getJobHealth = useCallback(
    (name: string) =>
      analyzeSystemJob(jobMap.get(name.toLowerCase()) ?? null),
    [jobMap],
  );

  const alerts = useMemo<AlertRow[]>(() => {
    const results: AlertRow[] = [];
    const nowIso = new Date().toISOString();

    if (ingestState === 'NOT LIVE') {
      results.push({
        id: 'ingest-stop',
        severity: 'critical',
        state: 'open',
        source: 'system',
        title: 'Market ingest halted',
        message: `Ingest offline (lag ${formatLag(worstLagSeconds)})`,
        createdAt: nowIso,
      });
    }

    for (const row of ingestRows) {
      if (row.status === 'RED') {
        results.push({
          id: `ingest-${row.symbol}`,
          severity: 'critical',
          state: 'open',
          source: 'system',
          title: 'Ingest lag',
          message: `${row.symbol} lagged ${Math.round(row.lag_seconds)}s`,
          createdAt: nowIso,
        });
      }
    }

    const localJobMap = new Map(jobMap);
    const now = Date.now();
    for (const job of localJobMap.values()) {
      const lastRun =
        job.lastRunUtc ??
        job.lastRunAt ??
        job.lastRunAtUtc ??
        job.last_run_utc ??
        null;
      const lastRunMs = lastRun ? Date.parse(lastRun) : NaN;
      const everyMs =
        job.everyMs ?? job.intervalMs ?? job.interval_ms ?? 60_000;
      const stale =
        Number.isFinite(lastRunMs) && now - Number(lastRunMs) > everyMs * 3;
      const jobName = job.name ?? 'unknown';
      if (job.lastOk === false || stale || !lastRun) {
        const normalized = jobName.toLowerCase();
        const isTicketizer = normalized === 'ticketizer-manual';
        results.push({
          id: `job-${jobName}`,
          severity:
            job.lastOk === false || (isTicketizer && stale)
              ? 'critical'
              : 'warning',
          state: 'open',
          source: 'engine',
          title: 'Job issue',
          message: `${jobName} ${
            job.lastOk === false ? 'reported errors' : 'is stale'
          }`,
          createdAt: nowIso,
        });
      }
    }
    const ticketizerHealth = getJobHealth('ticketizer-manual');
    if (ticketizerHealth.missing) {
      results.push({
        id: 'job-ticketizer-manual-missing',
        severity: 'critical',
        state: 'open',
        source: 'engine',
        title: 'Job issue',
        message: 'ticketizer-manual missing from scheduler payload',
        createdAt: nowIso,
      });
    }

    for (const snap of telemetry) {
      if (
        snap.errorCount > 0 ||
        snap.ingestGaps > 0 ||
        snap.metricsFailures > 0
      ) {
        results.push({
          id: `telemetry-${snap.jobName}`,
          severity: 'warning',
          state: 'open',
          source: 'system',
          title: 'Telemetry errors',
          message: `${snap.jobName} reported ${snap.errorCount} errors`,
          createdAt: nowIso,
        });
      }
    }
    return results;
  }, [health, jobs, telemetry, ingestRows, ingestState, worstLagSeconds, getJobHealth]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (stateFilter !== 'all' && alert.state !== stateFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, stateFilter]);

  const openCount = alerts.filter((a) => a.state === 'open').length;
  const criticalCount = alerts.filter(
    (a) => a.state === 'open' && a.severity === 'critical',
  ).length;
  const inWorkflowCount = alerts.filter((a) => a.state === 'acknowledged').length;

  const pillBase =
    'alerts-filter-pill rounded-full px-2 py-1 text-[10px] transition-colors';

  const activeClass = 'alerts-filter-pill--active bg-slate-200 text-slate-900';
  const inactiveClass = 'bg-slate-900 text-slate-300';

  return (
    <div className="a3-page-root">
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Alert stream</div>
          <h1>Alerts</h1>
          <p>
            Canonical alerts across risk, system, engine, infra and external dependencies.
            Use severity and lifecycle filters to triage what needs attention now.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={criticalCount > 0 ? 'red' : 'green'} className="text-[10px]">
            {criticalCount > 0 ? 'Critical alerts present' : 'No critical alerts'}
          </Badge>
          <Badge tone="neutral" className="text-[10px]">
            Source: /api/health/yahoo plus /api/system/alerts, /api/system/jobs, and /api/system/telemetry
          </Badge>
          <Button
            size="xs"
            tone="ghost"
            onClick={async () => {
              const timestamp = new Date().toISOString();
              const lines: string[] = [];
              lines.push(`Incident summary @ ${timestamp}`);
              lines.push(
                `Ingest state: ${ingestState} (lag ${formatLag(
                  worstLagSeconds,
                )})`,
              );
              const failingJobs: string[] = [];
              ['yahoo-ingest-manual', 'ticketizer-manual', 'DISK_TICKETS_SYNC'].forEach(
                (name) => {
                  const healthStatus = getJobHealth(name);
                  if (
                    healthStatus.missing ||
                    healthStatus.stale ||
                    !healthStatus.lastOk
                  ) {
                    failingJobs.push(describeJobHealth(name, healthStatus));
                  }
                },
              );
              if (failingJobs.length === 0) {
                failingJobs.push('None');
              }
              lines.push('Failing jobs:');
              lines.push(...failingJobs);
              lines.push('Top alerts:');
              const topAlerts = alerts.slice(0, 5);
              if (topAlerts.length === 0) {
                lines.push('None');
              } else {
                topAlerts.forEach((alert, idx) => {
                  lines.push(
                    `${idx + 1}. [${alert.severity.toUpperCase()}] ${
                      alert.title
                    } — ${alert.message}`,
                  );
                });
              }
              const payload = lines.join('\n');
              try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(payload);
                }
              } catch {
                // no-op; clipboard not available
              }
            }}
          >
            Copy incident summary
          </Button>
          {error && (
            <span className="text-[10px] text-rose-400">{error}</span>
          )}
        </div>
      </header>

      <section className="a3-page-main-card space-y-4">
        <div className="a3-page-kpi-strip">
          <Kpi
            label="Open alerts"
            value={openCount}
            tone="indigo"
            sublabel="Risk, system, engine, infra, external"
          />
          <Kpi label="Critical open" value={criticalCount} tone="rose" sublabel="Highest severity issues" />
          <Kpi label="In workflow" value={inWorkflowCount} tone="amber" sublabel="Acknowledged alerts" />
        </div>

      <Card className="a3-page-table-card">
        <CardHeader className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-200">
              Active alert stream
            </span>
            <span className="text-[11px] text-slate-500">
              Filter by severity and lifecycle state to focus the stream.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex flex-col">
              <span>Total alerts</span>
              <span className="font-geist-mono text-[12px] text-slate-100">
                {alerts.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span>Matching filters</span>
              <span className="font-geist-mono text-[12px] text-slate-100">
                {filteredAlerts.length}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 px-4 py-3">
          {/* Filters row – tests query by ".alerts-filters-row" */}
          <div className="alerts-filters-row flex flex-wrap items-center gap-6 text-[11px] text-slate-300">
            {/* Severity group */}
            <div className="alerts-filter-group flex items-center gap-2">
              <span className="text-slate-400">Severity</span>
              <div aria-label="Severity" className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'all' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'info' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('info')}
                >
                  Info
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'warning' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('warning')}
                >
                  Warning
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'critical' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('critical')}
                >
                  Critical
                </button>
              </div>
            </div>

            {/* State group */}
            <div className="alerts-filter-group flex items-center gap-2">
              <span className="text-slate-400">State</span>
              <div aria-label="State" className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'all' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'open' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('open')}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'acknowledged' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('acknowledged')}
                >
                  Acknowledged
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'cleared' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('cleared')}
                >
                  Cleared
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="dashboard-table min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Created</th>
                  <th className="px-3 py-2 font-normal">Severity</th>
                  <th className="px-3 py-2 font-normal">State</th>
                  <th className="px-3 py-2 font-normal">Source</th>
                  <th className="px-3 py-2 font-normal">Title</th>
                  <th className="px-3 py-2 font-normal">Message</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      Loading alerts…
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 align-top text-[11px] text-slate-500">
                        {alert.createdAt}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge
                          tone={
                            alert.severity === 'critical'
                              ? 'red'
                              : alert.severity === 'warning'
                              ? 'amber'
                              : 'blue'
                          }
                          className="text-[9px]"
                        >
                          {SEVERITY_LABEL[alert.severity]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {STATE_LABEL[alert.state]}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {SOURCE_LABEL[alert.source]}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                        {alert.title}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {alert.message}
                      </td>
                    </tr>
                  ))}
                {!loading && filteredAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No alerts match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      </section>
    </div>
  );
}
