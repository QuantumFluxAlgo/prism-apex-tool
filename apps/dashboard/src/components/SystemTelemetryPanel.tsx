/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React, { useEffect, useState } from 'react';
import { fetchSystemTelemetry, type JobTelemetrySnapshot } from '../lib/systemTelemetry';

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainderSeconds}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const SystemTelemetryPanel: React.FC = () => {
  const [jobs, setJobs] = useState<JobTelemetrySnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchSystemTelemetry();
      setJobs(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SystemTelemetryPanel] failed to fetch telemetry', err);
      setError('Unable to load scheduler telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 15000); // 15s refresh

    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-wide text-slate-50">
            Scheduler Telemetry
          </h2>
          <p className="text-xs text-slate-400">
            Per-job duration, errors, ingest gaps, and metrics failures.
          </p>
        </div>
        {loading ? (
          <span className="text-[11px] font-medium text-slate-400">
            Loading…
          </span>
        ) : (
          <span className="text-[11px] font-medium text-slate-500">
            Auto-refresh · 15s
          </span>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-950/40 px-3 py-2 text-[11px] text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-slate-800 bg-slate-950/80">
        <table className="min-w-full border-collapse text-[11px] text-slate-200">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-400">
                Job
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">
                Last Run
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">
                Last Duration
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">
                Avg Duration
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">
                Runs
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">
                Errors
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">
                Ingest Gaps
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">
                Metric Failures
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-3 text-center text-[11px] text-slate-500"
                >
                  No telemetry recorded yet. Jobs will appear here after they
                  run.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.jobName}
                  className="border-t border-slate-800/80 hover:bg-slate-900/60"
                >
                  <td className="px-3 py-2 align-middle text-[11px] font-medium text-slate-100">
                    {job.jobName}
                  </td>
                  <td className="px-3 py-2 align-middle text-[11px] text-slate-300">
                    {formatDate(job.lastRunAt)}
                  </td>
                  <td className="px-3 py-2 align-middle text-[11px] text-slate-300">
                    {formatDuration(job.lastDurationMs)}
                  </td>
                  <td className="px-3 py-2 align-middle text-[11px] text-slate-300">
                    {formatDuration(job.avgDurationMs)}
                  </td>
                  <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums text-slate-200">
                    {job.runCount}
                  </td>
                  <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums text-slate-200">
                    {job.errorCount}
                  </td>
                  <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums text-amber-300">
                    {job.ingestGaps}
                  </td>
                  <td className="px-3 py-2 align-middle text-right text-[11px] tabular-nums text-rose-300">
                    {job.metricsFailures}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
