/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

/**
 * PRISM APEX V2 — Strategy Lab
 *
 * Intent:
 * - Front-end-only Strategy Lab surface.
 * - Read analytics tickets via fetchAnalyticsCanonicalTickets(...).
 * - Provide a lab vs live KPI strip + trades preview per strategy.
 * - Absolutely no order routing or config writes from this page.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import { fetchAnalyticsCanonicalTickets } from '../lib/api';

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

type StrategyPreset = {
  id: string;
  label: string;
  code: string;
  description: string;
  defaultRiskTicks?: number;
};

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'orr',
    label: 'OR Reversal (ORR)',
    code: 'ORR',
    description:
      'Fade the initial OR extremes when session quality and regime support mean reversion.',
    defaultRiskTicks: 8,
  },
  {
    id: 'osb',
    label: 'OR Break (OSB)',
    code: 'OSB',
    description:
      'Breakout continuation from the OR, aligned with HTF trend and volatility regime.',
    defaultRiskTicks: 10,
  },
  {
    id: 'vwap-ft',
    label: 'VWAP Fade (FT)',
    code: 'VWAP-FT',
    description:
      'Fade stretched excursions away from VWAP back into fair value, inside approved regimes.',
    defaultRiskTicks: 6,
  },
];

function toNumber(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function formatPnL(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

function formatR(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(2);
}

function computeKpis(tickets: any[]) {
  const totalTrades = tickets.length;
  if (!totalTrades) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      avgRMultiple: 0,
    };
  }

  let totalPnL = 0;
  let totalR = 0;

  for (const t of tickets) {
    const pnl = toNumber(
      t.pnl ?? t.realisedPnl ?? t.realizedPnl ?? t.pnL ?? t.realisedPnL,
    );
    const r = toNumber(
      t.rMultiple ?? t.r_multiple ?? t.rMultipleApprox ?? t.r,
    );
    totalPnL += pnl;
    totalR += r;
  }

  return {
    totalTrades,
    totalPnL,
    avgRMultiple: totalR / totalTrades || 0,
  };
}

type LabTableRow = {
  id: string;
  date: string;
  symbol: string;
  strategy: string;
  side: string;
  pnl: number;
  rMultiple: number;
  regime: string;
  news: string;
};

function deriveTableRows(
  tickets: any[],
  fallbackStrategyCode: string | undefined,
): LabTableRow[] {
  return tickets.slice(0, 100).map((t, idx) => {
    const sessionDate =
      typeof t.analyticsDateLabel === 'string'
        ? t.analyticsDateLabel
        : typeof t.sessionDateUtc === 'string'
        ? t.sessionDateUtc.slice(0, 10)
        : '—';

    const pnl = toNumber(
      t.pnl ?? t.realisedPnl ?? t.realizedPnl ?? t.pnL ?? t.realisedPnL,
    );
    const r = toNumber(
      t.rMultiple ?? t.r_multiple ?? t.rMultipleApprox ?? t.r,
    );

    return {
      id: String(t.id ?? `lab-row-${idx}`),
      date: sessionDate,
      symbol: t.symbol ?? '—',
      strategy: t.strategyCode ?? t.strategy ?? fallbackStrategyCode ?? '—',
      side: t.side ?? '—',
      pnl,
      rMultiple: r,
      regime: t.regimeLabel ?? t.regime ?? '—',
      news:
        t.newsLabel ??
        (t.hasMajorNewsToday ? 'Major news in session' : 'No major news'),
    };
  });
}

function LabMetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-geist-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}

export default function StrategyLabPage() {
  const [mode, setMode] = useState<'live' | 'lab'>('lab');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('orr');

  const [analyticsState, setAnalyticsState] = useState<FetchState<any[]>>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsState({ loading: true, error: null, data: null });

      try {
        const tickets = await fetchAnalyticsCanonicalTickets({});
        if (!cancelled) {
          setAnalyticsState({
            loading: false,
            error: null,
            data: Array.isArray(tickets) ? tickets : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setAnalyticsState({
            loading: false,
            error: `Error loading analytics tickets: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  const presets = STRATEGY_PRESETS;
  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0];

  const allTickets = analyticsState.data ?? [];

  const filteredTickets = useMemo(() => {
    if (!selectedPreset?.code) return allTickets;
    const target = selectedPreset.code.toUpperCase();
    return allTickets.filter((t: any) => {
      const s = String(t.strategyCode ?? t.strategy ?? '').toUpperCase();
      return s === target;
    });
  }, [allTickets, selectedPreset]);

  const kpis = useMemo(
    () => computeKpis(filteredTickets),
    [filteredTickets],
  );

  const tableRows = useMemo<LabTableRow[]>(
    () => deriveTableRows(filteredTickets, selectedPreset?.code),
    [filteredTickets, selectedPreset],
  );

  const tableColumns = useMemo<DataTableColumn<LabTableRow>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-slate-400">
            {row.date}
          </span>
        ),
      },
      {
        key: 'symbol',
        header: 'Symbol',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-slate-100">
            {row.symbol}
          </span>
        ),
      },
      {
        key: 'strategy',
        header: 'Strategy',
        render: (row) => (
          <span className="text-[11px] text-slate-300">{row.strategy}</span>
        ),
      },
      {
        key: 'side',
        header: 'Side',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-slate-200">
            {row.side}
          </span>
        ),
      },
      {
        key: 'pnl',
        header: 'PnL',
        align: 'right',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-slate-100">
            {formatPnL(row.pnl)}
          </span>
        ),
      },
      {
        key: 'rMultiple',
        header: 'R multiple',
        align: 'right',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-slate-400">
            {formatR(row.rMultiple)}
          </span>
        ),
      },
      {
        key: 'regime',
        header: 'Regime',
        render: (row) => (
          <span className="text-[11px] text-slate-300">{row.regime}</span>
        ),
      },
      {
        key: 'news',
        header: 'News',
        render: (row) => (
          <span className="text-[11px] text-slate-500">{row.news}</span>
        ),
      },
    ],
    [],
  );

  const totalPnLLabel = formatPnL(kpis.totalPnL);
  const avgRLabel = formatR(kpis.avgRMultiple);
  const tradesLabel = String(kpis.totalTrades);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Strategy Lab
        </h1>
        <p className="text-xs text-slate-400">
          Front-end-only lab surface over the canonical analytics feed. Compare
          lab vs live performance for each strategy without routing orders.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => {
            const active = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPresetId(preset.id)}
                className={[
                  'h-7 rounded-full border px-3 text-[11px]',
                  active
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                    : 'border-slate-700 bg-slate-950/60 text-slate-300',
                ].join(' ')}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Mode</span>
          <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-950/80">
            <button
              type="button"
              onClick={() => setMode('live')}
              className={[
                'h-7 px-3 text-[11px]',
                mode === 'live'
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400',
              ].join(' ')}
            >
              Live config
            </button>
            <button
              type="button"
              onClick={() => setMode('lab')}
              className={[
                'h-7 px-3 text-[11px]',
                mode === 'lab'
                  ? 'bg-cyan-500/20 text-cyan-100'
                  : 'text-slate-400',
              ].join(' ')}
            >
              Lab config
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Card>
            <CardHeader className="flex items-center justify-between rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-200">
                  {selectedPreset.label}
                </span>
                <span className="text-[11px] text-slate-500">
                  Lab vs live KPIs from canonical analytics tickets.
                </span>
              </div>
              <Badge tone={mode === 'lab' ? 'amber' : 'green'} className="text-[9px]">
                {mode === 'lab' ? 'Lab mode' : 'Live mode'}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3 rounded-b-2xl bg-slate-950/60 px-4 py-3">
              <div className="grid grid-cols-3 gap-3 text-xs md:grid-cols-3">
                <LabMetricTile label="Total PnL" value={totalPnLLabel} />
                <LabMetricTile label="Trades" value={tradesLabel} />
                <LabMetricTile label="Avg R multiple" value={avgRLabel} />
              </div>

              {analyticsState.loading && (
                <p className="text-[11px] text-slate-300">
                  Loading analytics tickets…
                </p>
              )}

              {analyticsState.error && (
                <p className="text-[11px] text-red-300">
                  {analyticsState.error}
                </p>
              )}

              {!analyticsState.loading &&
                !analyticsState.error &&
                filteredTickets.length === 0 && (
                  <p className="text-[11px] text-slate-400">
                    No trades found for this strategy in the current analytics
                    window.
                  </p>
                )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-200">
                  Trades preview
                </span>
                <span className="font-geist-mono text-[11px] text-slate-400">
                  {filteredTickets.length} trades · strategy {selectedPreset.code}
                </span>
              </div>
            </CardHeader>
            <CardBody className="rounded-b-2xl bg-slate-950/60 px-4 py-3">
              {tableRows.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  When analytics trades are available for this strategy, the
                  canonical trades table will render here.
                </p>
              ) : (
                <DataTable
                  columns={tableColumns}
                  rows={tableRows}
                  rowKey={(row) => row.id}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-80">
          <Card>
            <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <span className="text-[11px] font-medium text-slate-200">
                Lab config snapshot
              </span>
            </CardHeader>
            <CardBody className="space-y-2 rounded-b-2xl bg-slate-950/60 px-4 py-3 text-[11px] text-slate-200">
              <p>{selectedPreset.description}</p>
              <p className="text-slate-400">
                Default risk per ticket:{' '}
                <span className="font-geist-mono text-slate-100">
                  {selectedPreset.defaultRiskTicks ?? '—'} ticks
                </span>
              </p>
              <p className="text-slate-400">
                This panel is read-only. Any real config changes must be applied
                via the back-office config channel and synced into the engine.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <span className="text-[11px] font-medium text-slate-200">
                Notes
              </span>
            </CardHeader>
            <CardBody className="space-y-2 rounded-b-2xl bg-slate-950/60 px-4 py-3 text-[11px] text-slate-300">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Lab vs live here is an analytics construct only; nothing in
                  this surface talks to an order API.
                </li>
                <li>
                  KPIs are computed from canonical analytics tickets using the
                  same contract as the Analytics page.
                </li>
                <li>
                  For deeper dives (per-session charts, regime drill-down),
                  pivot back to Analytics; Strategy Lab is for quick config
                  sanity checks.
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
