/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React, { useEffect, useState } from 'react';
import { fetchSystemAlerts, type SystemAlert, type AlertSeverity } from '../lib/systemAlerts';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function severityClasses(severity: AlertSeverity): string {
  switch (severity) {
    case 'info':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/40';
    case 'warning':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/40';
    case 'error':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/40';
    default:
      return 'bg-slate-600/10 text-slate-200 border-slate-500/40';
  }
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchSystemAlerts();
      setAlerts(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[AlertsPage] failed to fetch alerts', err);
      setError('Unable to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 15000); // 15s auto-refresh

    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-base font-semibold tracking-wide text-slate-50">System Alerts</h1>
        <p className="text-xs text-slate-400">
          High-signal events from scheduler, ingest, session metrics, and daily risk guardrails. Newest first. Auto-refresh every 15 seconds.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      <section className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-200">Recent Alerts</span>
            <span className="text-[10px] text-slate-500">
              {alerts.length === 0 && !loading ? 'No alerts yet.' : `${alerts.length} alert${alerts.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{loading ? 'Loading…' : 'Auto-refresh · 15s'}</span>
        </div>

        <div className="max-h-[480px] overflow-auto">
          <table className="min-w-full border-collapse text-[11px] text-slate-200">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
              <tr className="border-b border-slate-800/80">
                <th className="px-3 py-2 text-left font-medium text-slate-400">Time</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Severity</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Source / Code</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Message</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Entity</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-[11px] text-slate-500">
                    No alerts recorded yet. When scheduler jobs fail or daily lockout triggers, they will appear here.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const entity = alert.entityType && alert.entityId ? `${alert.entityType}:${alert.entityId}` : alert.jobName ?? '—';

                  return (
                    <tr key={alert.id} className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/60">
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">{formatDateTime(alert.createdAt)}</td>
                      <td className="px-3 py-2 align-top text-[11px]">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClasses(alert.severity)}`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-200">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-100">{alert.source}</span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">{alert.code}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-200">{alert.message}</td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">{entity}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default AlertsPage;
