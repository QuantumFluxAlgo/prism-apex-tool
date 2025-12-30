/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React, { useEffect, useState } from 'react';
import { fetchOperatorSizing, type OperatorSizingPayload } from '../lib/operatorSizing';

function formatContracts(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(0);
}

function formatPct(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function formatCurrency(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(0);
}

export const TicketSizingPreview: React.FC = () => {
  const [sizing, setSizing] = useState<OperatorSizingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchOperatorSizing();
      setSizing(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TicketSizingPreview] failed to fetch operator sizing', err);
      setError('Unable to load sizing preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold tracking-wide text-slate-50">Sizing Preview</h3>
          <p className="text-[11px] text-slate-400">Next-trade contract suggestion based on operator risk.</p>
        </div>
        {loading ? (
          <span className="text-[10px] font-medium text-slate-500">Loading…</span>
        ) : sizing?.tradingDay ? (
          <span className="text-[10px] font-medium text-slate-500">{sizing.tradingDay}</span>
        ) : null}
      </header>

      {error && (
        <div className="rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && !sizing && (
        <div className="text-[11px] text-slate-500">
          No sizing recommendation available. Check operator risk configuration.
        </div>
      )}

      {sizing && (
        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-200">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Suggested size</span>
            <span className="text-sm font-semibold text-slate-50">{formatContracts(sizing.suggestedContracts)} contracts</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Range</span>
            <span className="text-sm font-medium text-slate-50">
              {formatContracts(sizing.minContracts)}–{formatContracts(sizing.maxContracts)} contracts
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Per-contract risk</span>
            <span className="text-sm font-medium text-slate-50">{formatCurrency(sizing.perContractRisk)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Projected daily risk</span>
            <span className="text-sm font-medium text-slate-50">{formatPct(sizing.projectedDailyRiskPct)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Remaining drawdown</span>
            <span className="text-sm font-medium text-slate-50">{formatPct(sizing.remainingDrawdownPct)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">Utilisation</span>
            <span className="text-sm font-medium text-slate-50">{formatPct(sizing.utilisationPct)}</span>
          </div>
        </div>
      )}

      {sizing?.notes && <p className="text-[11px] text-slate-400">{sizing.notes}</p>}
    </section>
  );
};
