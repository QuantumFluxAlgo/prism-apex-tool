import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import {
  fetchSystemJobs,
  fetchSystemTelemetry,
  fetchYahooHealth,
  type SystemJobStatus,
  type SystemTelemetrySnapshot,
  type YahooHealthResponse,
} from '../lib/api';
import {
  deriveIngestState,
  formatLag,
  getWorstLagSeconds,
  statusChipTone,
  summarizeIngestRows,
  AMBER_THRESHOLD_SECONDS,
  RED_THRESHOLD_SECONDS,
  type IngestState,
} from '../lib/ingestState';
import { logContractError, logPageLoad } from '../lib/contractTelemetry';

const TARGET_JOB_NAMES = [
  'yahoo-ingest-manual',
  'ticketizer-manual',
  'DISK_TICKETS_SYNC',
] as const;

type TargetJobName = (typeof TARGET_JOB_NAMES)[number];
const REFRESH_INTERVAL_MS = 30_000;

type NormalizedJobRow = {
  name: TargetJobName;
  everyMs: number | null;
  disabled: boolean;
  lastRunUtc: string | null;
  lastOk: boolean | null;
  lastDurationMs: number | null;
  telemetry?: SystemTelemetrySnapshot;
};

function normalizeJobRows(
  jobStatuses: SystemJobStatus[],
  telemetry: SystemTelemetrySnapshot[],
): NormalizedJobRow[] {
  const jobMap = new Map<string, SystemJobStatus>();
  for (const job of jobStatuses) {
    if (job.name) {
      jobMap.set(job.name.toLowerCase(), job);
    }
  }
  const telemetryMap = new Map<string, SystemTelemetrySnapshot>();
  for (const snap of telemetry) {
    telemetryMap.set(snap.jobName.toLowerCase(), snap);
  }

  return TARGET_JOB_NAMES.map((target) => {
    const job = jobMap.get(target.toLowerCase());
    const snap = telemetryMap.get(target.toLowerCase());
    const rawInterval =
      job?.everyMs ?? job?.intervalMs ?? job?.interval_ms ?? null;
    const everyMs =
      typeof rawInterval === 'number' && Number.isFinite(rawInterval)
        ? rawInterval
        : null;
    const disabled = everyMs === null || everyMs <= 0;
    const lastRunUtc =
      job?.lastRunUtc ??
      job?.lastRunAtUtc ??
      job?.lastRunAt ??
      job?.last_run_utc ??
      snap?.lastRunAt ??
      null;
    const lastDurationMs =
      job?.lastDurationMs ?? job?.lastDuration ?? job?.last_duration_ms ?? snap?.lastDurationMs ?? null;
    const lastOk =
      job?.lastOk ?? job?.ok ?? snap?.lastOk ?? null;

    return {
      name: target,
      everyMs,
      disabled,
      lastRunUtc,
      lastOk,
      lastDurationMs,
      telemetry: snap,
    };
  });
}

function deriveJobTone(job: NormalizedJobRow): 'green' | 'amber' | 'red' {
  if (job.disabled) return 'green';
  const now = Date.now();
  const lastRunMs = job.lastRunUtc ? Date.parse(job.lastRunUtc) : NaN;
  const threshold =
    job.everyMs && job.everyMs > 0 ? job.everyMs * 3 : 5 * 60 * 1000;
  const stale =
    Number.isFinite(lastRunMs) && now - Number(lastRunMs) > threshold;
  if (!job.lastRunUtc || Number.isNaN(lastRunMs)) {
    return 'red';
  }
  if (job.lastOk === false) {
    return 'red';
  }
  if (stale) {
    return 'amber';
  }
  if (
    job.telemetry &&
    (job.telemetry.errorCount > 0 ||
      job.telemetry.ingestGaps > 0 ||
      job.telemetry.metricsFailures > 0)
  ) {
    return 'amber';
  }
  return 'green';
}

function formatLagSeconds(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}s`;
}

type JobHealth = {
  missing: boolean;
  stale: boolean;
  lastOk: boolean;
  lastRunUtc: string | null;
  everyMs: number | null;
  disabled: boolean;
};

function analyzeJobHealth(job?: NormalizedJobRow | null): JobHealth {
  if (!job) {
    return {
      missing: true,
      stale: true,
      lastOk: false,
      lastRunUtc: null,
      everyMs: null,
      disabled: false,
    };
  }
  if (job.disabled) {
    return {
      missing: false,
      stale: false,
      lastOk: true,
      lastRunUtc: job.lastRunUtc ?? null,
      everyMs: null,
      disabled: true,
    };
  }
  const everyMs =
    job.everyMs && job.everyMs > 0 ? job.everyMs : 60_000;
  const threshold = Math.max(everyMs * 3, 5 * 60 * 1000);
  const lastRunMs = job.lastRunUtc ? Date.parse(job.lastRunUtc) : NaN;
  const stale =
    !job.lastRunUtc ||
    !Number.isFinite(lastRunMs) ||
    Date.now() - Number(lastRunMs) > threshold;
  const lastOk = job.lastOk !== false;
  return {
    missing: false,
    stale,
    lastOk,
    lastRunUtc: job.lastRunUtc ?? null,
    everyMs,
    disabled: false,
  };
}

function describeJobHealth(
  name: string,
  health: JobHealth,
): string {
  if (health.disabled) {
    return `${name} disabled (manual trigger)`;
  }
  const intervalLabel =
    health.everyMs && Number.isFinite(health.everyMs)
      ? `${Math.round(health.everyMs / 1000)}s`
      : '—';
  return `${name} unhealthy (lastRun: ${health.lastRunUtc ?? '—'} · interval ${intervalLabel} · lastOk ${
    health.lastOk ? 'true' : 'false'
  } · stale ${health.stale ? 'true' : 'false'})`;
}

export default function Status() {
  const [yahooHealth, setYahooHealth] = useState<YahooHealthResponse | null>(null);
  const [jobs, setJobs] = useState<SystemJobStatus[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetrySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    logPageLoad('Status');
  }, []);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    [],
  );

  const loadStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent && !cancelRef.current) {
        setLoading(true);
      }
      if (!cancelRef.current) {
        setError(null);
      }
      try {
        const [healthRes, jobsRes, telemetryRes] = await Promise.all([
          fetchYahooHealth(),
          fetchSystemJobs(),
          fetchSystemTelemetry(),
        ]);
        if (cancelRef.current) return;
        setYahooHealth(healthRes ?? null);
        setJobs(Array.isArray(jobsRes) ? jobsRes : []);
        setTelemetry(Array.isArray(telemetryRes) ? telemetryRes : []);
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        if (!cancelRef.current) {
          setError('Unable to load system status');
          logContractError({
            pageId: 'Status',
            endpoint: 'status.loadBatch',
            error: err,
          });
        }
      } finally {
        if (!cancelRef.current) {
          if (!silent) {
            setLoading(false);
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadStatus({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, loadStatus]);

  const ingestRows = useMemo(() => {
    const rows = yahooHealth?.rows ?? [];
    return [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [yahooHealth]);

  const ingestCounts = useMemo(
    () => summarizeIngestRows(ingestRows),
    [ingestRows],
  );

  const jobRows = useMemo(
    () => normalizeJobRows(jobs, telemetry),
    [jobs, telemetry],
  );

  const ingestState = deriveIngestState(ingestRows);
  const overallTone = statusChipTone[ingestState];

  const ingestSummary = {
    live: ingestCounts.GREEN,
    degraded: ingestCounts.AMBER,
    down: ingestCounts.RED,
  };

  const jobTones = useMemo(() => {
    const toneMap = new Map<TargetJobName, ReturnType<typeof deriveJobTone>>();
    for (const job of jobRows) {
      toneMap.set(job.name, deriveJobTone(job));
    }
    return toneMap;
  }, [jobRows]);

  const tradingIssues = useMemo(() => {
    const issues: string[] = [];
    if (ingestState !== 'LIVE') {
      issues.push('Market ingest not live');
    }
    const yahooTone = jobTones.get('yahoo-ingest-manual');
    if (yahooTone !== 'green') {
      issues.push('yahoo-ingest-manual unhealthy');
    }
    const ticketizerTone = jobTones.get('ticketizer-manual');
    const ticketizerRow = jobRows.find(
      (job) => job.name === 'ticketizer-manual',
    );
    if (ticketizerTone !== 'green' && !ticketizerRow?.disabled) {
      issues.push('ticketizer-manual unhealthy');
    }
    return issues;
  }, [ingestState, jobTones, jobRows]);

  const tradingSafe = tradingIssues.length === 0;
  const lastRefreshedLabel = lastRefreshedAt
    ? new Date(lastRefreshedAt).toISOString()
    : '—';
  const worstLagSeconds = useMemo(
    () => getWorstLagSeconds(ingestRows),
    [ingestRows],
  );
  const ingestStop =
    ingestState === 'NOT LIVE' ||
    (typeof worstLagSeconds === 'number' &&
      worstLagSeconds > RED_THRESHOLD_SECONDS);
  const yahooJob = jobRows.find(
    (job) => job.name === 'yahoo-ingest-manual',
  );
  const ticketizerJob = jobRows.find(
    (job) => job.name === 'ticketizer-manual',
  );
  const diskSyncJob = jobRows.find(
    (job) => job.name === 'DISK_TICKETS_SYNC',
  );
  const yahooHealthStatus = analyzeJobHealth(yahooJob);
  const ticketizerHealthStatus = analyzeJobHealth(ticketizerJob);
  const diskHealthStatus = analyzeJobHealth(diskSyncJob);
  const ticketizerStop =
    !ticketizerHealthStatus.disabled &&
    (ticketizerHealthStatus.missing ||
      ticketizerHealthStatus.stale ||
      !ticketizerHealthStatus.lastOk);
  const ingestJobStop =
    yahooHealthStatus.missing ||
    yahooHealthStatus.stale ||
    !yahooHealthStatus.lastOk;
  const diskSyncDegraded =
    diskHealthStatus.missing ||
    diskHealthStatus.stale ||
    !diskHealthStatus.lastOk;
  const stopReasons: string[] = [];
  if (ingestStop) {
    stopReasons.push(
      `Market ingest ${ingestState} (lag ${formatLag(
        worstLagSeconds,
      )})`,
    );
  }
  if (ingestJobStop) {
    stopReasons.push(
      describeJobHealth('yahoo-ingest-manual', yahooHealthStatus),
    );
  }
  if (ticketizerStop) {
    stopReasons.push(
      describeJobHealth('ticketizer-manual', ticketizerHealthStatus),
    );
  }
  const degradeReasons: string[] = [];
  if (diskSyncDegraded) {
    degradeReasons.push(
      describeJobHealth('DISK_TICKETS_SYNC', diskHealthStatus),
    );
  }
  const anyStop = stopReasons.length > 0;

  return (
    <div className="a3-page-root">
      {/* Header */}
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Telemetry snapshot</div>
          <h1>System Status</h1>
          <p>
            High-level view of ingest freshness, scheduler jobs, and telemetry. Data is
            sourced from /api/health/yahoo plus /api/system/alerts, /api/system/jobs,
            and /api/system/telemetry.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <Badge tone={overallTone as any} className="text-[10px]">
            {ingestState}
          </Badge>
          <Badge tone="neutral" className="text-[10px]">
            Symbols monitored: {ingestRows.length}
          </Badge>
          {error && (
            <span className="text-[10px] text-rose-400">{error}</span>
          )}
        </div>
      </header>

      <section className="a3-page-main-card space-y-4">
        <Card className="a3-page-table-card">
          <CardHeader className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-100">
                STOP CONDITIONS
              </span>
              <span className="text-[11px] text-slate-400">
                Deterministic go/no-go checks for ingest + scheduler guardrails.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={anyStop ? 'rose' : 'emerald'} size="xs">
                {anyStop ? 'STOP' : 'CLEAR'}
              </Badge>
              {error && (
                <Badge tone="rose" size="xs">
                  STALE DATA
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardBody className="space-y-3 px-4 py-3 text-[11px] text-slate-200">
            {anyStop ? (
              <ul className="list-disc space-y-1 pl-5">
                {stopReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p>Trading safe (per telemetry).</p>
            )}
            {degradeReasons.length > 0 && (
              <div className="text-amber-200">
                <div className="font-semibold uppercase tracking-[0.18em] text-[10px] text-amber-300">
                  Degraded
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {degradeReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <Button
                size="xs"
                tone="ghost"
                onClick={() => loadStatus()}
                disabled={loading}
              >
                Refresh now
              </Button>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                  aria-label="Auto-refresh (30s)"
                  className="h-3 w-3 rounded border border-slate-600 bg-transparent text-emerald-500"
                />
                Auto-refresh (30s)
              </label>
              <span className="font-geist-mono text-slate-300">
                Last successful refresh: {lastRefreshedLabel}
              </span>
            </div>
          </CardBody>
        </Card>

        <div
          className={`rounded-xl border px-4 py-3 text-[11px] ${
            tradingSafe
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-50'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.2em]">
                {tradingSafe ? 'TRADING SAFE' : 'TRADING UNSAFE'}
              </div>
              <p className="text-[11px] text-slate-200">
                {tradingSafe
                  ? 'Ingest and scheduler guardrails are healthy.'
                  : 'Guardrails flagged the following blockers:'}
              </p>
            </div>
            <Badge tone={tradingSafe ? 'emerald' : 'rose'} size="xs">
              {ingestState}
            </Badge>
          </div>
          {!tradingSafe && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-slate-200">
              {tradingIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>

        {/* KPI strip */}
        <div className="a3-page-kpi-strip">
          <Kpi label="GREEN" value={ingestSummary.live} tone="emerald" sublabel="Lag ≤ 120s" />
          <Kpi label="AMBER" value={ingestSummary.degraded} tone="amber" sublabel="Lag ≤ 300s" />
          <Kpi label="RED" value={ingestSummary.down} tone="rose" sublabel="Lag > 300s" />
        </div>

        {/* Prism core jobs card */}
        <Card className="a3-page-table-card">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-200">
                Prism core jobs
              </span>
              <span className="text-[11px] text-slate-500">
                Ingest, ticketizer, and disk sync cadence pulled directly from
                /api/system/jobs.
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-4 py-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Job</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Interval</th>
                  <th className="px-3 py-2 font-normal">Last run (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {jobRows.map((row) => {
                  const tone = deriveJobTone(row);
                  const intervalLabel =
                    row.disabled || row.everyMs == null
                      ? 'manual'
                      : `${Math.round(row.everyMs / 1000)}s`;
                  const statusLabel = row.disabled
                    ? 'Disabled'
                    : tone === 'green'
                    ? 'Healthy'
                    : tone === 'amber'
                    ? 'Degraded'
                    : 'Down';
                  const badgeTone = row.disabled ? 'neutral' : tone;
                  return (
                  <tr
                    key={row.name}
                    className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={badgeTone as any}
                        className="text-[9px]"
                      >
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {intervalLabel}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                      {row.lastRunUtc ?? '—'}
                    </td>
                  </tr>
                );
                })}
                {!jobRows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No job telemetry available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Ingest freshness */}
      <Card className="a3-page-table-card">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-200">
                Ingest freshness
              </span>
              <span className="text-[11px] text-slate-500">
                Derived directly from /health/yahoo.
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-4 py-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Symbol</th>
                  <th className="px-3 py-2 font-normal">Lag</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Last bar</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      Loading status…
                    </td>
                  </tr>
                )}
                {!loading &&
                  ingestRows.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                      {row.symbol}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={
                          row.status === 'GREEN'
                            ? 'green'
                            : row.status === 'AMBER'
                            ? 'amber'
                            : 'red'
                        }
                        className="text-[9px]"
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {formatLagSeconds(row.lag_seconds)}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                      {row.last_bar_timestamp}
                    </td>
                  </tr>
                  ))}
                {!loading && !ingestRows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No ingest telemetry available.
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
