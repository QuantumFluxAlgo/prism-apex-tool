// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Market Data
 *
 * Intent:
 * - Use live endpoints without assuming their shape.
 * - Render an A2-style Markets surface that matches the HTML mock structurally.
 * - Keep behaviour conservative and resilient; no brittle DTO coupling.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';

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

function formatMetric(value: unknown, opts?: { dp?: number; suffix?: string }) {
  if (value === null || value === undefined) return '—';

  const suffix = opts?.suffix ?? '';
  const dp = opts?.dp ?? 2;

  if (typeof value === 'number') {
    return `${value.toFixed(dp)}${suffix}`;
  }

  if (typeof value === 'boolean') {
    return value ? `Yes${suffix}` : `No${suffix}`;
  }

  return String(value);
}

export default function MarketDataPage() {
  const [symbolsState, setSymbolsState] = useState<FetchState<SymbolSummary[]>>({
    loading: true,
    error: null,
    data: null,
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const [metricsState, setMetricsState] = useState<FetchState<unknown>>({
    loading: false,
    error: null,
    data: null,
  });

  // Load available symbols once
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
  }, []); // run once

  // Load session metrics when symbol changes
  useEffect(() => {
    if (!selectedSymbol) {
      setMetricsState({ loading: false, error: null, data: null });
      return;
    }

    let cancelled = false;

    async function loadMetrics() {
      setMetricsState({ loading: true, error: null, data: null });

      try {
        const url = `${SESSION_METRICS_ENDPOINT}?symbol=${encodeURIComponent(
          selectedSymbol,
        )}`;
        const res = await fetch(url);
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
  }, [selectedSymbol]);

  const symbols = symbolsState.data || [];
  const metrics: any = metricsState.data ?? null;

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

  return (
    <div className="flex flex-col gap-4">
      {/* PAGE HEADER */}
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Markets
        </h1>
        <p className="text-xs text-slate-400">
          Session context for the current symbol: coverage, regime, and volatility
          checks wired to live session-metrics endpoints.
        </p>
      </header>

      {/* TOP CONTROLS BAR (A2-style pills) */}
      <section className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3 text-[11px]">
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-full border border-slate-700 bg-slate-950/80 px-3 text-[11px] text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
            value={selectedSymbol || ''}
            onChange={(e) => setSelectedSymbol(e.target.value || null)}
          >
            {symbolOptions.map((s) => (
              <option key={s.symbol} value={s.symbol === 'Loading symbols…' || s.symbol === 'No symbols available' ? '' : s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>

          <button className="px-3 h-7 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            1m ▾
          </button>
          <button className="px-3 h-7 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            Session: RTH ▾
          </button>
          <button className="px-3 h-7 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300 flex items-center gap-1">
            Overlays
            <span className="text-[10px] text-slate-500">
              VWAP • OR • ATR • Signals
            </span>
          </button>
          <button className="px-3 h-7 rounded-full border border-slate-700 bg-slate-950/60 text-[11px] text-slate-300">
            Compare ▾
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Scrub</span>
            <div className="w-40 h-[3px] rounded-full bg-slate-600/60 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-[-3px] w-3 h-3 rounded-full bg-cyan-400/90" />
            </div>
          </div>
          <span className="font-mono text-slate-400">
            {headerSymbolLabel}
          </span>
        </div>
      </section>

      {/* MAIN AREA: CHART + CONTEXT CARDS */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* CHART / SESSION PANEL */}
        <Card className="flex-1 flex flex-col gap-3">
          <CardHeader className="flex items-center justify-between rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-3">
            <div className="text-[11px] text-slate-400">
              Price · VWAP · OR · ATR · Signals
            </div>
            <div className="font-mono text-[11px] text-slate-300">
              {headerSymbolLabel} · Session metrics
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 rounded-b-2xl bg-slate-950/60 px-4 py-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 flex items-center justify-center h-72">
              {metricsState.loading && (
                <p className="text-xs text-slate-300">
                  Loading session metrics…
                </p>
              )}
              {!metricsState.loading && metricsState.error && (
                <p className="text-xs text-red-300">{metricsState.error}</p>
              )}
              {!metricsState.loading &&
                !metricsState.error &&
                !metricsState.data && (
                  <p className="text-xs text-slate-400 text-center px-4">
                    No metrics returned for the current selection. Once DTOs are
                    final, this card will render the live price/VWAP/ATR overlay for
                    {` ${headerSymbolLabel}.`}
                  </p>
                )}
              {!metricsState.loading &&
                !metricsState.error &&
                metricsState.data && (
                  <p className="text-xs text-slate-300 text-center px-4">
                    Session metrics loaded for{' '}
                    <span className="font-mono text-slate-100">
                      {headerSymbolLabel}
                    </span>
                    . The chart placeholder is intentionally flat for now; it will be
                    wired to this payload in the final Markets V2 visual pass.
                  </p>
                )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div>
                Session: Today · RTH · time scrubber is visual-only in this
                scaffold.
              </div>
              <div className="flex items-center gap-2">
                <span>Zoom</span>
                <div className="flex gap-1">
                  <button className="px-2 py-0.5 rounded border border-slate-700 bg-slate-950/80">
                    -
                  </button>
                  <button className="px-2 py-0.5 rounded border border-slate-700 bg-slate-950/80">
                    +
                  </button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* CONTEXT CARDS (RIGHT-HAND COLUMN) */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-3">
          {/* Session Metrics */}
          <Card>
            <CardBody className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="text-[11px] font-medium text-slate-300">
                Session Metrics
              </div>
              <dl className="mt-2 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <dt>OR Width</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.orWidthPoints ??
                        metrics?.orWidth ??
                        null,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>OR / ATR Ratio</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.orWidthToAtrRatio ?? null,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>VWAP Slope</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(metrics?.vwapSlope ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Price vs VWAP</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.priceVsVwapAtOrEnd ?? null,
                    )}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {/* Volatility & Regime */}
          <Card>
            <CardBody className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="text-[11px] font-medium text-slate-300">
                Volatility &amp; Regime
              </div>
              <dl className="mt-2 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <dt>Session ATR (pts)</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.sessionAtrPoints ?? null,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Vol Regime</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(metrics?.volRegime ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Liquidity Regime</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(metrics?.liquidityRegime ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Bars Analyzed</dt>
                  <dd className="font-mono text-slate-100">
                    {formatMetric(metrics?.barsAnalyzed ?? null, {
                      dp: 0,
                    })}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {/* Active Strategies / Flags */}
          <Card>
            <CardBody className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3">
              <div className="text-[11px] font-medium text-slate-300">
                Active Flags &amp; Strategies
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Major news today</span>
                  <span className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.hasMajorNewsToday ?? null,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>News window</span>
                  <span className="font-mono text-slate-100">
                    {formatMetric(metrics?.newsWindow ?? null)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>News label</span>
                  <span className="font-mono text-slate-100">
                    {formatMetric(metrics?.newsLabel ?? null)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session quality</span>
                  <span className="font-mono text-slate-100">
                    {formatMetric(
                      metrics?.sessionQualityFlag ?? null,
                    )}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* SIGNAL STRIP – CURRENTLY JUST A PLACEHOLDER ROW */}
      <Card>
        <CardHeader className="rounded-t-2xl border-b border-slate-800/80 bg-slate-950/80 px-4 py-2 text-[11px] font-medium text-slate-400">
          LAST SIGNALS — CURRENT SYMBOL
        </CardHeader>
        <CardBody className="rounded-b-2xl bg-slate-950/60 px-4 py-3">
          <div className="text-xs text-slate-500">
            No live signal feed is wired into Markets yet. This strip will be driven
            by canonical tickets (signals, actions, expiries, downranks) once the
            tickets/markets integration EPIC lands.
          </div>
        </CardBody>
      </Card>

      {/* RAW METRICS PAYLOAD (UNCHANGED, FOR DEBUGGING) */}
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Raw metrics payload
          </h2>
        </CardHeader>
        <CardBody>
          <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-[11px] text-slate-100">
{JSON.stringify(metricsState.data, null, 2) || 'null'}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
