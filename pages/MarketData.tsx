// apps/dashboard/src/pages/MarketData.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchSessionMetricsBatch,
  makeSessionMetricsKey,
  type SessionMetricsDto,
} from '../lib/api';

const DEFAULT_SYMBOLS = ['ES', 'NQ', 'CL', 'YM'];

type MetricsByKey = Record<string, SessionMetricsDto | null>;

function todayIsoDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const MarketDataPage: React.FC = () => {
  const [sessionDate, setSessionDate] = useState<string>(() => todayIsoDate());
  const [symbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [metricsByKey, setMetricsByKey] = useState<MetricsByKey>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ES');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const requests = symbols.map((symbol) => ({
          symbol,
          sessionDate,
        }));

        const result = await fetchSessionMetricsBatch(requests);

        if (cancelled) return;

        setMetricsByKey(result);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load market data');
        setMetricsByKey({});
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [symbols, sessionDate]);

  const selectedMetrics: SessionMetricsDto | null = useMemo(() => {
    const key = makeSessionMetricsKey(selectedSymbol, sessionDate);
    return metricsByKey[key] ?? null;
  }, [metricsByKey, selectedSymbol, sessionDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionDate(e.target.value);
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSymbol(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100">
              Markets
            </h1>
            <p className="text-xs text-slate-400">
              Session context, volatility and quality per symbol from canonical session metrics.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <span
              data-testid="badge"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-200"
            >
              Read-only market context
            </span>
            <span
              data-testid="badge"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-400"
            >
              Backed by /api/session-metrics
            </span>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <div data-testid="card" className="rounded-xl border border-slate-800 bg-slate-950">
        <div data-testid="card-body" className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Session date</span>
              <input
                type="date"
                className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                value={sessionDate}
                onChange={handleDateChange}
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="text-slate-400">Symbol</span>
              <select
                className="h-8 rounded-md bg-slate-900 border border-slate-700 text-slate-100 px-2"
                value={selectedSymbol}
                onChange={handleSymbolChange}
              >
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* SUMMARY GRID */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {symbols.map((symbol) => {
          const key = makeSessionMetricsKey(symbol, sessionDate);
          const m = metricsByKey[key];

          const orWidth = m?.orWidthPoints ?? null;
          const atr = m?.sessionAtrPoints ?? null;
          const orToAtr =
            orWidth !== null && atr && atr !== 0 ? orWidth / atr : null;

          return (
            <div
              key={symbol}
              data-testid="card"
              className={`cursor-pointer rounded-xl border ${
                symbol === selectedSymbol
                  ? 'border-sky-500 bg-slate-900'
                  : 'border-slate-800 bg-slate-950'
              } p-3`}
              onClick={() => setSelectedSymbol(symbol)}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    {symbol}
                  </div>
                  <div className="text-[0.7rem] text-slate-500">
                    {m?.sessionQualityFlag ?? 'No quality flag'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-[0.7rem]">
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300">
                    {m?.volRegime ?? 'No vol regime'}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300">
                    {m?.htfTrendBias ?? 'No trend bias'}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[0.7rem] text-slate-300">
                <div>
                  <div className="text-slate-500">OR high</div>
                  <div className="font-mono">
                    {m?.orHigh != null ? m.orHigh.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">OR low</div>
                  <div className="font-mono">
                    {m?.orLow != null ? m.orLow.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">OR width</div>
                  <div className="font-mono">
                    {orWidth != null ? orWidth.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ATR (pts)</div>
                  <div className="font-mono">
                    {atr != null ? atr.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">OR / ATR</div>
                  <div className="font-mono">
                    {orToAtr != null ? orToAtr.toFixed(2) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">News</div>
                  <div className="font-mono">
                    {m?.hasMajorNewsToday
                      ? m.newsLabel ?? 'Major news'
                      : 'None flagged'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL PANEL */}
      <div className="w-full max-w-xl" data-testid="card">
        <div data-testid="card-body" className="p-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Session details
          </h2>

          {!selectedMetrics && !loading && !error && (
            <div className="mt-3 text-xs text-slate-400">
              No metrics loaded for {selectedSymbol} on {sessionDate}. Check that
              the session metrics job has populated this day.
            </div>
          )}

          {loading && (
            <div className="mt-3 text-xs text-slate-400">
              Loading session metrics…
            </div>
          )}

          {error && !loading && (
            <div className="mt-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {selectedMetrics && !loading && !error && (
            <div className="mt-3 space-y-4 text-xs text-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.8rem]">
                  {selectedSymbol} – {sessionDate}
                </span>
                <span
                  data-testid="badge"
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-100"
                >
                  {selectedMetrics.sessionQualityFlag ?? 'No quality flag'}
                </span>
                {selectedMetrics.volRegime && (
                  <span
                    data-testid="badge"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-300"
                  >
                    Vol regime {selectedMetrics.volRegime}
                  </span>
                )}
                {selectedMetrics.htfTrendBias && (
                  <span
                    data-testid="badge"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.7rem] text-slate-300"
                  >
                    Trend {selectedMetrics.htfTrendBias}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                <div>
                  <div className="text-slate-500">Opening range</div>
                  <div className="font-mono">
                    {selectedMetrics.orLow != null &&
                    selectedMetrics.orHigh != null
                      ? `${selectedMetrics.orLow.toFixed(2)} → ${selectedMetrics.orHigh.toFixed(2)}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">OR width (pts)</div>
                  <div className="font-mono">
                    {selectedMetrics.orWidthPoints != null
                      ? selectedMetrics.orWidthPoints.toFixed(2)
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ATR (pts)</div>
                  <div className="font-mono">
                    {selectedMetrics.sessionAtrPoints != null
                      ? selectedMetrics.sessionAtrPoints.toFixed(2)
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">OR / ATR</div>
                  <div className="font-mono">
                    {selectedMetrics.orWidthToAtrRatio != null
                      ? selectedMetrics.orWidthToAtrRatio.toFixed(2)
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                <div>
                  <div className="text-slate-500">VWAP slope</div>
                  <div className="font-mono">
                    {selectedMetrics.vwapSlope ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Session skip reason</div>
                  <div className="font-mono">
                    {selectedMetrics.sessionSkipReason ?? '—'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[0.7rem] text-slate-400">
                <p>
                  This panel surfaces the same session metrics used by the
                  engine for guardrails. Use it to decide whether today&apos;s
                  context is worth taking risk in each symbol, not to override
                  the rules in code.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketDataPage;

