/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

/**
 * PRISM APEX V2 — Market Data
 *
 * Intent:
 * - Use live endpoints without assuming their exact shape.
 * - Render an A2-style Markets surface that shows session metrics context
 *   for the selected symbol (regime, OR/ATR, news, quality).
 * - Be defensive: tolerate missing fields, API errors, and empty symbol lists.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

type SymbolSummary = {
  symbol: string;
  lastClose?: number;
  lastIngestUtc?: string;
};

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const SYMBOLS_ENDPOINT = '/api/symbols';
const SESSION_METRICS_ENDPOINT = '/api/session-metrics';

const pointsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const ratioFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatPoints(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${pointsFormatter.format(value)}pt`;
}

function formatRatio(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return ratioFormatter.format(value);
}

function formatDateLabel(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSessionDateForSymbol(summary: SymbolSummary | null): string | null {
  // Prefer lastIngestUtc date; fall back to "today" if missing.
  if (!summary?.lastIngestUtc) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  return summary.lastIngestUtc.slice(0, 10);
}

function formatSessionSummary(metrics: any): string {
  if (!metrics) return 'No session metrics available.';
  const parts: string[] = [];

  if (typeof metrics.orWidthPoints === 'number') {
    parts.push(`OR ${formatPoints(metrics.orWidthPoints)}`);
  }
  if (typeof metrics.sessionAtrPoints === 'number') {
    parts.push(`ATR ${formatPoints(metrics.sessionAtrPoints)}`);
  }
  if (metrics.orWidthToAtrRatio !== undefined && metrics.orWidthToAtrRatio !== null) {
    parts.push(`OR/ATR ${formatRatio(metrics.orWidthToAtrRatio)}`);
  }
  if (metrics.vwapSlope) parts.push(`VWAP ${String(metrics.vwapSlope)}`);
  if (metrics.htfTrendBias) parts.push(`Trend ${String(metrics.htfTrendBias)}`);
  if (metrics.hasMajorNewsToday) parts.push('News risk');

  if (!parts.length) return 'Session metrics loaded.';
  return parts.join(' · ');
}

function qualityTone(metrics: any): 'green' | 'amber' | 'red' | 'gray' {
  if (!metrics) return 'gray';
  const flag = metrics.sessionQualityFlag;
  if (flag === 'GOOD' || flag === 'OK') return 'green';
  if (flag === 'SKIP') return 'red';
  if (flag === 'WARN') return 'amber';
  return 'amber';
}

function qualityLabel(metrics: any): string {
  if (!metrics) return 'No session classification';
  if (metrics.sessionQualityFlag) return String(metrics.sessionQualityFlag);
  return 'Unclassified';
}

function newsLabel(metrics: any): string {
  if (!metrics) return 'No news flags';
  return metrics.hasMajorNewsToday ? 'Major news in session' : 'No major news';
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-geist-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}

export default function MarketDataPage() {
  const [symbolsState, setSymbolsState] = useState<FetchState<SymbolSummary[]>>({
    loading: true,
    error: null,
    data: null,
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const [metricsState, setMetricsState] = useState<FetchState<any>>({
    loading: false,
    error: null,
    data: null,
  });

  // Load available symbols once.
  useEffect(() => {
    let cancelled = false;

    async function loadSymbols() {
      setSymbolsState((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch(SYMBOLS_ENDPOINT);

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (!cancelled) {
            setSymbolsState({
              loading: false,
              error: `Failed to load symbols (${res.status}) ${text}`,
              data: null,
            });
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list = Array.isArray(json) ? (json as SymbolSummary[]) : [];

        if (!cancelled) {
          setSymbolsState({
            loading: false,
            error: null,
            data: list,
          });

          if (!selectedSymbol && list.length > 0) {
            setSelectedSymbol(list[0].symbol);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSymbolsState({
            loading: false,
            error: `Error loading symbols: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadSymbols();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const symbols: SymbolSummary[] = useMemo(
    () => symbolsState.data || [],
    [symbolsState.data],
  );

  const selectedSummary: SymbolSummary | null = useMemo(
    () => symbols.find((s) => s.symbol === selectedSymbol) || null,
    [symbols, selectedSymbol],
  );

  const sessionDate: string | null = useMemo(
    () => getSessionDateForSymbol(selectedSummary),
    [selectedSummary],
  );

  // Load session metrics when symbol or sessionDate changes.
  useEffect(() => {
    if (!selectedSymbol || !sessionDate) {
      setMetricsState({ loading: false, error: null, data: null });
      return;
    }

    let cancelled = false;

    async function loadMetrics() {
      setMetricsState({ loading: true, error: null, data: null });

      try {
        const params = new URLSearchParams({
          symbol: selectedSymbol,
          sessionDate,
        });

        const res = await fetch(`${SESSION_METRICS_ENDPOINT}?${params.toString()}`);

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (!cancelled) {
            setMetricsState({
              loading: false,
              error: `Failed to load session metrics (${res.status}) ${text}`,
              data: null,
            });
          }
          return;
        }

        const json = await res.json().catch(() => null);

        if (!cancelled) {
          setMetricsState({
            loading: false,
            error: null,
            data: json,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMetricsState({
            loading: false,
            error: `Error loading session metrics: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, sessionDate]);

  const symbolOptions =
    symbols.length === 0
      ? [
          {
            symbol: symbolsState.loading
              ? 'Loading symbols…'
              : 'No symbols available',
          },
        ]
      : symbols;

  const headerSymbolLabel = selectedSymbol || 'No symbol selected';
  const sessionDateLabel = sessionDate ? formatDateLabel(sessionDate) : '—';
  const metrics = metricsState.data;

  return (
    <div className="flex flex-col gap-4">
      {/* PAGE HEADER */}
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Markets
        </h1>
        <p className="text-xs text-slate-400">
          Session context for the current symbol: coverage, regime, volatility,
          and news flags via live session metrics.
        </p>
      </header>

      {symbolsState.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-100">
          {symbolsState.error}
        </div>
      )}

      {/* TOP CONTROLS BAR (A2-style pills) */}
      <section className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3 text-[11px]">
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-full border border-slate-700 bg-slate-950/80 px-3 text-[11px] text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
            value={selectedSymbol || ''}
            onChange={(e) => setSelectedSymbol(e.target.value || null)}
          >
            {symbolOptions.map((s) => (
                <option
                  key={s.symbol}
                  value={
                    s.symbol === 'Loading symbols…' || s.symbol === 'No symbols available'
                      ? ''
                      : s.symbol
                  }
                >
                {s.symbol}
              </option>
            ))}
          </select>

          <button className="h-7 px-3 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            1m ▾
          </button>
          <button className="h-7 px-3 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            Session: RTH ▾
          </button>
          <button className="flex h-7 items-center gap-1 rounded-full border border-slate-700 bg-slate-950/60 px-3 text-[11px] text-slate-300">
            Overlays
            <span className="text-[10px] text-slate-500">
              VWAP • OR • ATR • Signals
            </span>
          </button>
          <button className="h-7 px-3 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            Compare ▾
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Scrub</span>
            <div className="relative h-[3px] w-40 rounded-full bg-slate-600/60">
              <div className="absolute top-[-3px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400/90" />
            </div>
          </div>
          <span className="font-geist-mono text-slate-400">
            {headerSymbolLabel}
            {sessionDate ? ` · Session ${sessionDateLabel}` : ''}
          </span>
        </div>
      </section>

      {/* MAIN AREA: CHART PANEL + CONTEXT CARDS */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* CHART / SESSION PANEL */}
        <Card className="flex flex-1 flex-col gap-3">
          <CardHeader className="flex items-center justify-between rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
            <div className="text-[11px] text-slate-400">
              Price · VWAP · OR · ATR · Signals
            </div>
            <div className="font-geist-mono text-[11px] text-slate-300">
              {headerSymbolLabel} · Session {sessionDateLabel}
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 rounded-b-2xl bg-slate-950/60 px-4 py-4">
            <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/90">
              {metricsState.loading ? (
                <p className="text-xs text-slate-200">Loading session metrics…</p>
              ) : metricsState.error ? (
                <p className="max-w-md text-center text-xs text-red-300">
                  {metricsState.error}
                </p>
              ) : metrics ? (
                <div className="flex max-w-xl flex-col items-center gap-2 text-center">
                  <p className="text-[11px] font-geist-mono uppercase tracking-[0.18em] text-slate-500">
                    Session overlays (VWAP · OR · ATR)
                  </p>
                  <p className="text-sm text-slate-100">
                    {formatSessionSummary(metrics)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Visual overlays will sit on top of this panel; metrics summary
                    is live today.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Select a symbol to load session metrics.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <MetricTile
                label="OR width"
                value={metrics ? formatPoints(metrics.orWidthPoints) : '—'}
              />
              <MetricTile
                label="Session ATR"
                value={metrics ? formatPoints(metrics.sessionAtrPoints) : '—'}
              />
              <MetricTile
                label="OR / ATR"
                value={metrics ? formatRatio(metrics.orWidthToAtrRatio) : '—'}
              />
              <MetricTile
                label="VWAP slope"
                value={metrics?.vwapSlope ? String(metrics.vwapSlope) : '—'}
              />
            </div>
          </CardBody>
        </Card>

        {/* CONTEXT / QUALITY COLUMN */}
        <div className="flex w-full flex-col gap-3 lg:w-80">
          <Card>
            <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-200">
                  Session classification
                </span>
                <Badge tone={qualityTone(metrics)} className="text-[9px]">
                  {qualityLabel(metrics)}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-2 rounded-b-2xl bg-slate-950/60 px-4 py-3 text-xs text-slate-200">
              <p>{newsLabel(metrics)}</p>
              {metrics?.sessionSkipReason && (
                <p className="text-[11px] text-amber-300">
                  Skip reason: {String(metrics.sessionSkipReason)}
                </p>
              )}
              {metrics?.status === 'ERROR' && (
                <p className="text-[11px] text-red-300">
                  Metrics service reported an error for this session.
                </p>
              )}
              {!metrics && !metricsState.loading && (
                <p className="text-[11px] text-slate-400">
                  When session metrics are available, quality flags and news risk
                  will appear here.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <span className="text-[11px] font-medium text-slate-200">
                Raw session payload (debug)
              </span>
            </CardHeader>
            <CardBody className="rounded-b-2xl bg-slate-950/60 px-4 py-3">
              {metrics ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-400">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              ) : (
                <p className="text-[11px] text-slate-500">
                  No payload loaded. Select a symbol and ensure session metrics are
                  available for the chosen session date.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
