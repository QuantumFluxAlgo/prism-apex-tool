/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

/**
 * PRISM APEX V2 — Strategy Lab (A3 cockpit)
 *
 * Intent:
 * - Front-end-only Strategy Lab surface.
 * - Read analytics tickets via fetchAnalyticsCanonicalTickets(...).
 * - Strategy presets across the top (ORR / OSB / VWAP-FT).
 * - Left: Lab KPIs + canonical trades preview for the selected strategy.
 * - Right: Read-only config snapshot + guardrail notes.
 * - Absolutely no order routing or config writes from this page.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import {
  fetchAnalyticsCanonicalTickets,
  fetchYahooHealth,
} from '../lib/api';
import {
  deriveIngestState,
  getWorstLagSeconds,
  formatLag,
  statusChipTone,
  type IngestState,
} from '../lib/ingestState';
import { logContractError, logPageLoad } from '../lib/contractTelemetry';
import '../styles/strategy-lab-a3.css';

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
    <div className="strategy-lab-metric-tile">
      <div className="strategy-lab-metric-label">{label}</div>
      <div className="strategy-lab-metric-value">{value}</div>
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
  const [ingestState, setIngestState] = useState<IngestState>('UNKNOWN');
  const [worstLag, setWorstLag] = useState<number | null>(null);

  useEffect(() => {
    logPageLoad('StrategyLab');
  }, []);

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
          logContractError({
            pageId: 'StrategyLab',
            endpoint: 'analytics.canonical',
            error: err,
          });
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadIngest() {
      try {
        const response = await fetchYahooHealth();
        if (cancelled) return;
        const rows = response?.rows ?? [];
        setIngestState(deriveIngestState(rows));
        setWorstLag(getWorstLagSeconds(rows));
      } catch (err) {
        if (!cancelled) {
          setIngestState('UNKNOWN');
          setWorstLag(null);
          logContractError({
            pageId: 'StrategyLab',
            endpoint: '/api/health/yahoo',
            error: err,
          });
        }
      }
    }
    loadIngest();
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
  const hasRows = tableRows.length > 0;

  const ingestUnsafe = ingestState === 'NOT LIVE';
  const showBanner =
    ingestState === 'DEGRADED' || ingestState === 'NOT LIVE';
  const bannerTone =
    ingestState === 'NOT LIVE' ? 'rose' : 'amber';

  return (
    <section className="strategy-lab-v2-root space-y-5">
      {/* A3 header */}
      <header className="strategy-lab-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Strategy Lab
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Front-end-only lab surface over the canonical analytics feed. Compare
              lab vs live KPIs by strategy without routing orders or touching config.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <Badge tone="blue">Canonical analytics feed</Badge>
            <Badge tone="gray">Read-only · No order routing</Badge>
            <Badge tone={statusChipTone[ingestState]} size="xs">
              Ingest {ingestState} · {formatLag(worstLag)}
            </Badge>
          </div>
        </div>
      </header>

      {showBanner && (
        <div
          className={`rounded-xl border px-4 py-3 text-[0.8rem] ${
            bannerTone === 'rose'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-50'
          }`}
        >
          {ingestState === 'NOT LIVE' ? (
            <p>
              Market ingest is <strong>NOT LIVE</strong>. Latest bars are unavailable
              ({formatLag(worstLag)} lag). Lab controls are locked until ingest recovers.
            </p>
          ) : (
            <p>
              Market ingest is <strong>DEGRADED</strong>. Expect stale analytics inputs
              ({formatLag(worstLag)} lag) while reviewing lab presets.
            </p>
          )}
        </div>
      )}

      {/* Preset strip + mode toggle */}
      <section className="strategy-lab-v2-strip">
        {ingestUnsafe && (
          <div className="mb-2 flex items-center gap-2 text-[0.75rem] text-rose-200">
            <Badge tone="rose" size="xs">
              UNSAFE
            </Badge>
            Market ingest not live — preset + mode controls disabled.
          </div>
        )}
        <div className="strategy-lab-preset-group">
          {presets.map((preset) => {
            const active = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPresetId(preset.id)}
                className={`${
                  active
                    ? 'strategy-lab-preset-btn strategy-lab-preset-btn-active'
                    : 'strategy-lab-preset-btn'
                } ${ingestUnsafe ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={ingestUnsafe}
                aria-disabled={ingestUnsafe}
              >
                <span className="strategy-lab-preset-label">{preset.label}</span>
                <span className="strategy-lab-preset-code">{preset.code}</span>
              </button>
            );
          })}
        </div>

        <div className="strategy-lab-mode-toggle">
          <span className="strategy-lab-mode-label">Mode</span>
          <div className="strategy-lab-mode-pill">
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`${
                mode === 'live'
                  ? 'strategy-lab-mode-btn strategy-lab-mode-btn-active'
                  : 'strategy-lab-mode-btn'
              } ${ingestUnsafe ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={ingestUnsafe}
              aria-disabled={ingestUnsafe}
            >
              Live config
            </button>
            <button
              type="button"
              onClick={() => setMode('lab')}
              className={`${
                mode === 'lab'
                  ? 'strategy-lab-mode-btn strategy-lab-mode-btn-active strategy-lab-mode-btn-lab'
                  : 'strategy-lab-mode-btn'
              } ${ingestUnsafe ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={ingestUnsafe}
              aria-disabled={ingestUnsafe}
            >
              Lab config
            </button>
          </div>
        </div>
      </section>

      {/* Main cockpit layout */}
      <div className="strategy-lab-v2-layout">
        {/* Left – KPIs + trades table */}
        <div className="panel strategy-lab-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Lab KPIs · Canonical Analytics Tickets
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                {selectedPreset.label}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-400">
              <span>{filteredTickets.length} trades in window</span>
              <span>Lab surface only · no order APIs</span>
            </div>
          </div>

          <div className="panel-body space-y-3">
            <div className="strategy-lab-metric-grid">
              <LabMetricTile label="Total PnL" value={totalPnLLabel} />
              <LabMetricTile label="Trades" value={tradesLabel} />
              <LabMetricTile label="Avg R multiple" value={avgRLabel} />
            </div>

            {analyticsState.loading && (
              <p className="strategy-lab-status-line">
                {/* Keep this string stable for tests */}
                Loading analytics tickets…
              </p>
            )}

            {analyticsState.error && (
              <p className="strategy-lab-status-line strategy-lab-status-error">
                {analyticsState.error}
              </p>
            )}

            {!analyticsState.loading &&
              !analyticsState.error &&
              filteredTickets.length === 0 && (
                <p className="strategy-lab-status-line">
                  No trades found for this strategy in the current analytics window.
                </p>
              )}

            {!analyticsState.loading &&
              !analyticsState.error &&
              hasRows && (
                <div className="strategy-lab-v2-table-wrapper">
                  <DataTable
                    className="strategy-lab-v2-table"
                    columns={tableColumns}
                    rows={tableRows}
                    rowKey={(row) => row.id}
                  />
                </div>
              )}
          </div>
        </div>

        {/* Right – config + notes */}
        <aside className="panel strategy-lab-v2-details w-full max-w-[380px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Lab Config Snapshot
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              Read-only configuration hints for the selected strategy preset.
            </span>
          </div>

          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            <section className="details-section">
              <h3 className="details-label">Preset</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.8rem] text-slate-100">
                    {selectedPreset.label}
                  </span>
                  <Badge tone="gray">{selectedPreset.code}</Badge>
                  <Badge tone={mode === 'lab' ? 'amber' : 'green'}>
                    {mode === 'lab' ? 'Lab mode' : 'Live mode'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Default risk per ticket:{' '}
                  <span className="font-mono text-[0.8rem] text-slate-100">
                    {selectedPreset.defaultRiskTicks ?? '—'} ticks
                  </span>
                  . Actual live risk is owned by back-office config, not this page.
                </p>
              </div>
            </section>

            <section className="details-section">
              <h3 className="details-label">Behaviour</h3>
              <p className="mt-2 text-sm text-slate-200">
                {selectedPreset.description}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                KPIs above are computed from canonical analytics tickets using the
                same contract as the Analytics page. Use them to sanity-check whether
                the current config is behaving as expected for this preset.
              </p>
            </section>

            <section className="details-section">
              <h3 className="details-label">Guardrails</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[0.78rem] text-slate-300">
                <li>
                  Strategy Lab is a visualisation layer only. It never routes or
                  cancels orders.
                </li>
                <li>
                  Any real config changes must go through the back-office config path
                  and be deployed into the engine.
                </li>
                <li>
                  For deeper per-session drill-down, pivot to Analytics; Strategy Lab
                  is for quick directional checks and config conversations.
                </li>
              </ul>
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
}
