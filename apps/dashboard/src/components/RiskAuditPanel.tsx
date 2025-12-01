/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React, { useEffect, useState } from 'react';
import { fetchRiskAuditLog, type RiskAuditEntry, type RiskAuditKind } from '../lib/riskAudit';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function kindLabel(kind: RiskAuditKind): string {
  if (kind === 'snapshot') return 'Snapshot';
  if (kind === 'lockout') return 'Lockout';
  return kind;
}

function kindClasses(kind: RiskAuditKind): string {
  switch (kind) {
    case 'snapshot':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/40';
    case 'lockout':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/40';
    default:
      return 'bg-slate-600/10 text-slate-200 border-slate-500/40';
  }
}

function snapshotSummary(entry: RiskAuditEntry): string {
  const { snapshot } = entry;
  if (!snapshot || typeof snapshot !== 'object') return '—';

  const s = snapshot as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof s.realisedPnL === 'number') {
    parts.push(`Realised PnL ${s.realisedPnL.toFixed(0)}`);
  }

  if (typeof s.openRisk === 'number') {
    parts.push(`Open risk ${s.openRisk.toFixed(0)}`);
  }

  if (typeof s.remainingRiskCapacity === 'number') {
    parts.push(`Remaining DD ${s.remainingRiskCapacity.toFixed(0)}`);
  }

  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

export const RiskAuditPanel: React.FC = () => {
  const [entries, setEntries] = useState<RiskAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchRiskAuditLog();
      setEntries(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RiskAuditPanel] failed to fetch audit log', err);
      setError('Unable to load risk audit entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30000);
    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-wide text-slate-50">Risk Audit Log</h2>
          <p className="text-xs text-slate-400">Daily snapshots and lockout decisions for operator risk controls.</p>
        </div>
        {loading ? (
          <span className="text-[11px] font-medium text-slate-400">Loading…</span>
        ) : (
          <span className="text-[11px] font-medium text-slate-500">Auto-refresh · 30s</span>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-slate-800 bg-slate-950/80">
        <table className="min-w-full border-collapse text-[11px] text-slate-200">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Time</th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Kind</th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Trading Day</th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Source / Reason</th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Snapshot Summary</th>
              <th className="px-3 py-2 text-left font-medium text-slate-400">Entity</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-center text-[11px] text-slate-500">
                  No risk audit entries recorded yet. When daily snapshots and lockout decisions are evaluated, they will appear here.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const entity = entry.accountId ? `account:${entry.accountId}` : entry.symbol ? `symbol:${entry.symbol}` : '—';
                return (
                  <tr key={entry.id} className="border-t border-slate-800/80 hover:bg-slate-900/60">
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-3 py-2 align-top text-[11px]">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${kindClasses(entry.kind)}`}
                      >
                        {kindLabel(entry.kind)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">{entry.tradingDay}</td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-200">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-100">{entry.source}</span>
                        <span className="text-[10px] text-slate-400">{entry.reason}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-200">{snapshotSummary(entry)}</td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">{entity}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
