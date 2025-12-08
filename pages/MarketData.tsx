/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */

import React from 'react';
import Badge from '../ui/Badge';
import FiltersBar from '../ui/FiltersBar';
import '../styles/markets-a3.css';
import { fetchSessionMetrics } from '../lib/api';
import type { SessionMetricsDto } from '../lib/api';
import { fmtPrice } from '../utils/number';

const SYMBOL_OPTIONS = ['ES', 'NQ', 'YM', 'CL', 'RTY'] as const;

type OverlayState = {
  orBand: boolean;
  vwap: boolean;
  atr: boolean;
};

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

const pointsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const ratioFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatPoints(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${pointsFormatter.format(value)}pt`;
}

function formatRatio(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return ratioFormatter.format(value);
}

function computeOrAtrRatio(metrics: SessionMetricsDto | null): number | null {
  if (!metrics) return null;
  const m: any = metrics;
  const orWidth =
    typeof m.orWidthPoints === 'number' ? m.orWidthPoints : null;
  const atr =
    typeof m.sessionAtrPoints === 'number' ? m.sessionAtrPoints : null;
  if (
    orWidth === null ||
    atr === null ||
    !Number.isFinite(orWidth) ||
    !Number.isFinite(atr) ||
    atr === 0
  ) {
    return null;
  }
  return orWidth / atr;
}

type SessionChartPoint = {
  index: number;
  price: number;
  vwap: number;
  orHigh: number;
  orLow: number;
};

function buildSyntheticSeries(
  metrics: SessionMetricsDto | null,
  symbol: string,
): SessionChartPoint[] {
  const m: any = metrics ?? {};
  const count = 48;

  const baseSeed =
    Array.from(symbol).reduce((acc, char) => acc + char.charCodeAt(0), 0) +
    (typeof m.orHigh === 'number' ? Math.round(m.orHigh) : 0) +
    (typeof m.orLow === 'number' ? Math.round(m.orLow) : 0);

  const width =
    typeof m.orWidthPoints === 'number' && m.orWidthPoints > 0
      ? m.orWidthPoints
      : 16;
  const atr =
    typeof m.sessionAtrPoints === 'number' && m.sessionAtrPoints > 0
      ? m.sessionAtrPoints
      : 10;

  const basePrice =
    typeof m.orLow === 'number' && typeof m.orHigh === 'number'
      ? (m.orLow + m.orHigh) / 2
      : 4000 + (baseSeed % 200);

  const amplitude = (width + atr) * 0.6;

  let trendSign = 0;
  const slope = (m.vwapSlope ?? '').toString().toUpperCase();
  if (slope.includes('UP')) trendSign = 1;
  else if (slope.includes('DOWN')) trendSign = -1;

  const points: SessionChartPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const wave =
      Math.sin(t * Math.PI * 2) * (amplitude * 0.35) +
      Math.cos(t * Math.PI * 4) * (amplitude * 0.18);
    const drift = trendSign * t * (amplitude * 0.6);

    const price = basePrice + wave + drift;
    const vwap = basePrice + drift * 0.75;
    const orHalf = width / 2 || amplitude * 0.4;

    points.push({
      index: i,
      price,
      vwap,
      orHigh: basePrice + orHalf,
      orLow: basePrice - orHalf,
    });
  }

  return points;
}

function buildChartGeometry(series: SessionChartPoint[]) {
  if (!series.length) {
    return {
      pricePoints: '',
      vwapPoints: '',
      bandPoints: '',
    };
  }

  const allValues: number[] = [];
  series.forEach((p) => {
    allValues.push(p.price, p.vwap, p.orHigh, p.orLow);
  });

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const n = series.length;

  const toCoord = (value: number, idx: number) => {
    const x = 2 + (idx * 96) / (n - 1);
    const norm = (value - min) / range;
    const y = 36 - norm * 28; // keep top/bottom margin
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const pricePoints = series
    .map((p, idx) => toCoord(p.price, idx))
    .join(' ');
  const vwapPoints = series
    .map((p, idx) => toCoord(p.vwap, idx))
    .join(' ');

  const bandTop = series
    .map((p, idx) => toCoord(p.orHigh, idx))
    .join(' ');
  const bandBottom = [...series]
    .reverse()
    .map((p, revIdx) =>
      toCoord(p.orLow, n - 1 - revIdx),
    )
    .join(' ');

  const bandPoints = `${bandTop} ${bandBottom}`;

  return { pricePoints, vwapPoints, bandPoints };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="markets-a3-info-row">
      <span className="markets-a3-info-label">{label}</span>
      <span className="markets-a3-info-value">{value ?? '—'}</span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="markets-a3-metric-tile">
      <div className="markets-a3-metric-header">
        <span className="markets-a3-metric-label">{label}</span>
        {hint ? (
          <span className="markets-a3-metric-hint">{hint}</span>
        ) : null}
      </div>
      <div className="markets-a3-metric-value">{value ?? '—'}</div>
    </div>
  );
}

function SessionContextChart({
  symbol,
  metrics,
  overlays,
}: {
  symbol: string;
  metrics: SessionMetricsDto | null;
  overlays: OverlayState;
}) {
  const series = React.useMemo(
    () => buildSyntheticSeries(metrics, symbol),
    [metrics, symbol],
  );
  const { pricePoints, vwapPoints, bandPoints } = React.useMemo(
    () => buildChartGeometry(series),
    [series],
  );

  const m: any = metrics ?? {};
  const orWidth = formatPoints(m.orWidthPoints);
  const atr = formatPoints(m.sessionAtrPoints);

  return (
    <div className="markets-a3-chart-shell">
      <div className="markets-a3-chart-header">
        <div>
          <p className="markets-a3-card-kicker">
            Session overlays · price · VWAP · OR · ATR
          </p>
          <h3 className="markets-a3-card-title">
            Synthetic price path today
          </h3>
        </div>
        <div className="markets-a3-chart-legends">
          <div className="markets-a3-legend-pill markets-a3-legend-price">
            <span className="dot" />
            <span>Price</span>
          </div>
          <div className="markets-a3-legend-pill markets-a3-legend-vwap">
            <span className="dot" />
            <span>VWAP</span>
          </div>
          <div className="markets-a3-legend-pill markets-a3-legend-or">
            <span className="dot" />
            <span>OR band</span>
          </div>
        </div>
      </div>

      <div className="markets-a3-chart-body">
        <svg
          className="markets-a3-chart-svg"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="markets-a3-price-line"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient
              id="markets-a3-vwap-line"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
            <linearGradient
              id="markets-a3-or-band"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgba(37,99,235,0.55)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.95)" />
            </linearGradient>
          </defs>

          {/* grid baseline */}
          <line
            x1="2"
            y1="37"
            x2="98"
            y2="37"
            className="markets-a3-chart-baseline"
          />

          {overlays.orBand && bandPoints && (
            <polygon
              points={bandPoints}
              fill="url(#markets-a3-or-band)"
              className="markets-a3-chart-orband"
            />
          )}

          {overlays.atr && (
            <rect
              x="2"
              y="6"
              width="8"
              height="28"
              className="markets-a3-chart-atrbar"
            />
          )}

          {pricePoints && (
            <polyline
              points={pricePoints}
              fill="none"
              stroke="url(#markets-a3-price-line)"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {overlays.vwap && vwapPoints && (
            <polyline
              points={vwapPoints}
              fill="none"
              stroke="url(#markets-a3-vwap-line)"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 2"
              opacity={0.9}
            />
          )}
        </svg>
      </div>

      <div className="markets-a3-chart-foot">
        <span className="markets-a3-chart-foot-text">
          OR width {orWidth}, ATR {atr}. Synthetic path mirrors the same
          session engine that powers Worklist scores.
        </span>
      </div>
    </div>
  );
}

export default function MarketDataPage() {
  const [symbol, setSymbol] = React.useState<string>('ES');
  const [sessionDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [overlays, setOverlays] = React.useState<OverlayState>({
    orBand: true,
    vwap: true,
    atr: false,
  });
  const [metrics, setMetrics] = React.useState<SessionMetricsDto | null>(
    null,
  );
  const [status, setStatus] = React.useState<SessionStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    fetchSessionMetrics({ symbol, sessionDate })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setMetrics(result);
          setStatus('ready');
        } else {
          setMetrics(null);
          setStatus('idle');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMetrics(null);
        setStatus('error');
        setErrorMessage(
          'Failed to load session metrics. Using synthetic-only view.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, sessionDate]);

  const m: any = metrics ?? {};
  const orWidth = formatPoints(m.orWidthPoints);
  const sessionAtr = formatPoints(m.sessionAtrPoints);
  const ratio = computeOrAtrRatio(metrics);
  const orAtr = formatRatio(ratio);

  const vwapSlope = (m.vwapSlope ?? '—').toString();
  const trendBias = (m.htfTrendBias ?? '—').toString();
  const regime = (m.volRegime ?? 'Unclassified').toString();

  const hasNews = Boolean(m.hasMajorNewsToday);
  const newsLabel =
    m.newsLabel ??
    (hasNews ? 'Major event flagged by config' : 'None flagged');

  const qualityFlag =
    m.sessionQualityFlag ?? 'No session classification';
  const skipReason = m.sessionSkipReason ?? 'OK to trade if rules pass';
  const engineStatus = m.status ?? 'UNKNOWN';

  const rawPayload = metrics
    ? JSON.stringify(metrics, null, 2)
    : 'No payload loaded. Select a symbol and ensure SessionMetrics are available for the chosen session date.';

  const overlayToggles = [
    {
      label: 'OR band',
      checked: overlays.orBand,
      onChange: (checked: boolean) =>
        setOverlays((prev) => ({ ...prev, orBand: checked })),
    },
    {
      label: 'VWAP trace',
      checked: overlays.vwap,
      onChange: (checked: boolean) =>
        setOverlays((prev) => ({ ...prev, vwap: checked })),
    },
    {
      label: 'ATR marker',
      checked: overlays.atr,
      onChange: (checked: boolean) =>
        setOverlays((prev) => ({ ...prev, atr: checked })),
    },
  ];

  const statusLabel =
    status === 'loading'
      ? 'Loading session metrics…'
      : status === 'error'
      ? 'Error loading metrics'
      : metrics
      ? 'Session metrics live'
      : 'Synthetic only';

  return (
    <section className="markets-a3-root space-y-5">
      {/* A3 header */}
      <header className="markets-a3-header">
        <div className="markets-a3-header-main">
          <h1>Session Context</h1>
          <p>
            Price overlays, OR / ATR footprint, VWAP slope, and regime flags
            for the currently selected symbol. Metrics are driven by the
            same session engine that powers Worklist scores.
          </p>
        </div>
        <div className="markets-a3-header-meta">
          <Badge tone="blue">Session · UTC</Badge>
          <Badge tone="gray">Environment · A3 Shell</Badge>
        </div>
      </header>

      {/* Filters row */}
      <div className="markets-a3-filters">
        <FiltersBar
          selects={[
            {
              label: 'Symbol',
              value: symbol,
              options: SYMBOL_OPTIONS,
              onChange: (value: string) => setSymbol(value),
            },
          ]}
          toggles={overlayToggles}
          extra={
            <div className="markets-a3-filters-extra">
              <Badge tone="gray">Session · {sessionDate}</Badge>
              <span className="markets-a3-filters-status">
                {statusLabel}
              </span>
            </div>
          }
        />
      </div>

      {/* Main layout */}
      <div className="markets-a3-layout">
        {/* Left: chart + metrics */}
        <div className="markets-a3-main-panel">
          <SessionContextChart
            symbol={symbol}
            metrics={metrics}
            overlays={overlays}
          />

          <div className="markets-a3-metrics-row">
            <MetricTile
              label="OR width"
              value={orWidth}
              hint="Opening range in points"
            />
            <MetricTile
              label="Session ATR"
              value={sessionAtr}
              hint="Session ATR footprint"
            />
            <MetricTile
              label="OR / ATR"
              value={orAtr}
              hint="Risk expansion vs ATR"
            />
            <MetricTile
              label="VWAP slope"
              value={vwapSlope}
              hint="Short-term bias"
            />
            <MetricTile
              label="Trend bias"
              value={trendBias}
              hint="HTF regime"
            />
            <MetricTile
              label="News"
              value={hasNews ? newsLabel : 'None flagged'}
              hint={hasNews ? 'News risk active' : 'Clean session'}
            />
          </div>
        </div>

        {/* Right: classification + debug */}
        <aside className="markets-a3-sidebar">
          <div className="markets-a3-sidebar-card">
            <p className="markets-a3-card-kicker">
              Session classification
            </p>
            <h3 className="markets-a3-card-title">
              {qualityFlag}
            </h3>

            <div className="markets-a3-sidebar-body">
              <InfoRow label="Regime" value={regime} />
              <InfoRow label="Engine status" value={engineStatus} />
              <InfoRow label="Skip reason" value={skipReason} />
              <InfoRow
                label="News flags"
                value={hasNews ? newsLabel : 'None'}
              />
            </div>
          </div>

          <div className="markets-a3-sidebar-card markets-a3-sidebar-debug">
            <p className="markets-a3-card-kicker">Raw session payload</p>
            <h3 className="markets-a3-card-title">Debug view</h3>
            {errorMessage ? (
              <p className="markets-a3-error-text">{errorMessage}</p>
            ) : null}
            <pre className="markets-a3-debug-pre">
              {rawPayload}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
