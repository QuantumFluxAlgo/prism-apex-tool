// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Market Data (safe stub)
 *
 * Intent:
 * - Use live endpoints without assuming their shape.
 * - Never throw if APIs 404/500 or return unexpected JSON.
 * - Provide a simple ES-style symbol selector + raw metrics preview.
 *
 * This is intentionally conservative: it shows enough to validate the pipeline
 * without coupling tightly to DTOs. Refine post-V2 once DTOs are stable.
 */

import React, { useEffect, useState } from 'react';

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

export default function MarketDataPage() {
  const [symbolsState, setSymbolsState] = useState<FetchState<SymbolSummary[]>>({
    loading: true,
    error: null,
    data: null,
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const [metricsState, setMetricsState] = useState<
    FetchState<unknown>
  >({
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-50">Market Data</h1>
        <p className="text-sm text-slate-400">
          Lightweight view to validate symbol coverage and session metrics
          without risking runtime errors.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Symbol
            </span>
            <select
              className="h-9 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500"
              value={selectedSymbol || ''}
              onChange={(e) =>
                setSelectedSymbol(e.target.value || null)
              }
            >
              {symbols.length === 0 && (
                <option value="" disabled>
                  {symbolsState.loading
                    ? 'Loading symbols…'
                    : 'No symbols available'}
                </option>
              )}
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol}
                </option>
              ))}
            </select>
            {symbolsState.error && (
              <p className="mt-1 text-xs text-red-300">
                {symbolsState.error}
              </p>
            )}
          </div>

          {selectedSymbol && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Selected
              </span>
              <span className="text-sm font-mono text-slate-100">
                {selectedSymbol}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Coverage
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Symbols loaded:{' '}
              <span className="font-semibold">
                {symbols.length}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Backed by /api/symbols. Exact shape is intentionally loose
              to keep this view resilient to DTO churn.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Metrics status
            </h2>
            {metricsState.loading && (
              <p className="mt-2 text-sm text-slate-300">
                Loading session metrics…
              </p>
            )}
            {!metricsState.loading && metricsState.error && (
              <p className="mt-2 text-sm text-red-300">
                {metricsState.error}
              </p>
            )}
            {!metricsState.loading &&
              !metricsState.error &&
              metricsState.data && (
                <p className="mt-2 text-sm text-emerald-300">
                  Session metrics loaded.
                </p>
              )}
            {!metricsState.loading &&
              !metricsState.error &&
              !metricsState.data && (
                <p className="mt-2 text-sm text-slate-400">
                  No metrics returned for current selection.
                </p>
              )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notes
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              This is a V2-safe scaffold. Once DTOs stabilise, plug in
              proper charts and context using the same fetch pattern.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Raw metrics payload
        </h2>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-xs text-slate-100">
{JSON.stringify(metricsState.data, null, 2) || 'null'}
        </pre>
      </section>
    </div>
  );
}
