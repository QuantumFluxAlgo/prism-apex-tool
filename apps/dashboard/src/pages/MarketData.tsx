import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';

type BarsSummary = Record<
  string,
  {
    count: number;
    minTsUtc: string | null;
    maxTsUtc: string | null;
  }
>;

type MarketDataPayload = {
  bars: BarsSummary;
  tickets: { total: number | null; today: number | null };
  lastIngestUtc: string | null;
  dbConnected: boolean;
};

type CandlePoint = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

const SYMBOL_OPTIONS = [
  'ES=F',
  'NQ=F',
  'MES=F',
  'MNQ=F',
  'YM=F',
  'RTY=F',
  'GC=F',
  'CL=F',
  '6E=F',
  'EURUSD=X',
  'BTC-USD',
];

export default function MarketDataPage() {
  const [summary, setSummary] = useState<MarketDataPayload | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(SYMBOL_OPTIONS[0]);
  const [bars, setBars] = useState<CandlePoint[]>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [lastChartUpdate, setLastChartUpdate] = useState<Date | null>(null);

const chartContainerRef = useRef<HTMLDivElement | null>(null);
const chartApiRef = useRef<IChartApi | null>(null);
const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MarketDataPayload;
      setSummary(json);
      setSummaryError(null);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const fetchBars = useCallback(
    async (sym: string) => {
      setIsChartLoading(true);
      try {
        const params = new URLSearchParams({ symbol: sym, limit: '720' });
        const res = await fetch(`/api/metrics/bars?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { points: CandlePoint[] };
        setBars(json.points);
        setChartError(null);
        setLastChartUpdate(new Date());
      } catch (err) {
        setChartError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsChartLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchSummary();
    const interval = window.setInterval(fetchSummary, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchSummary]);

  useEffect(() => {
    fetchBars(selectedSymbol);
    const interval = window.setInterval(() => fetchBars(selectedSymbol), 60_000);
    return () => window.clearInterval(interval);
  }, [selectedSymbol, fetchBars]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
      grid: {
        vertLines: { color: '#1f2937', style: 1, visible: true },
        horzLines: { color: '#1f2937', style: 1, visible: true },
      },
      height: 420,
      width: chartContainerRef.current.clientWidth,
      localization: {
        dateFormat: 'MMM dd',
        timeFormatter: (timestamp: number) =>
          new Date(timestamp * 1000).toLocaleTimeString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
      timeScale: {
        secondsVisible: false,
        timeVisible: true,
        borderVisible: false,
        tickMarkFormatter: (time: Time) =>
          typeof time === 'number'
            ? new Date(time * 1000).toLocaleTimeString(undefined, {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
      },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#16a34a',
      downColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      borderVisible: false,
    });
    const volumeSeries = chart.addHistogramSeries({
      color: '#38bdf8',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const tooltip = document.createElement('div');
    tooltip.className =
      'absolute pointer-events-none rounded-xl bg-slate-900/95 text-slate-100 text-xs px-3 py-2 shadow-xl border border-slate-700 hidden';
    chartContainerRef.current.style.position = 'relative';
    chartContainerRef.current.appendChild(tooltip);

    const moveTooltip = (x: number, y: number) => {
      tooltip.style.left = `${x + 12}px`;
      tooltip.style.top = `${y + 12}px`;
    };

    const handleCrosshairMove = (param: any) => {
      if (param.time === undefined || !param.point) {
        tooltip.classList.add('hidden');
        return;
      }
      const candle = candleSeriesRef.current
        ? (param.seriesData.get(candleSeriesRef.current) as any)
        : null;
      const vol = volumeSeriesRef.current
        ? (param.seriesData.get(volumeSeriesRef.current) as any)
        : null;
      tooltip.innerHTML = `
        <div class="font-semibold text-slate-200">${formatTooltipTime(param.time)}</div>
        <div>O ${formatNumber(candle?.open)}</div>
        <div>H ${formatNumber(candle?.high)}</div>
        <div>L ${formatNumber(candle?.low)}</div>
        <div>C ${formatNumber(candle?.close)}</div>
        <div class="mt-1 text-sky-300">Vol ${vol?.value ? Number(vol.value).toLocaleString() : '—'}</div>
      `;
      tooltip.classList.remove('hidden');
      moveTooltip(param.point.x, param.point.y);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const handleResize = () => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      tooltip.remove();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || bars.length === 0) return;
    const candleData = bars.map((point) => ({
      time: Math.floor(new Date(point.ts).getTime() / 1000),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));
    candleSeriesRef.current.setData(candleData);
    if (volumeSeriesRef.current) {
      const volumeData = bars.map((point) => ({
        time: Math.floor(new Date(point.ts).getTime() / 1000),
        value: point.volume ?? 0,
        color: point.close >= point.open ? '#16a34a55' : '#dc262655',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
    chartApiRef.current?.timeScale().fitContent();
  }, [bars]);

  const latestCandle = bars[bars.length - 1];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <strong>Ingestion Overview</strong>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-4">
          <Stat label="DB Connection" value={summary?.dbConnected ? 'Live' : 'Down'} accent={summary?.dbConnected ? 'green' : 'red'} />
          <Stat label="Last Ingest" value={summary?.lastIngestUtc ? new Date(summary.lastIngestUtc).toLocaleString() : '—'} />
          <Stat label="Tickets Today" value={summary?.tickets.today?.toLocaleString() ?? '—'} />
          <Stat label="Tickets Total" value={summary?.tickets.total?.toLocaleString() ?? '—'} />
        </CardBody>
        {summaryError && <p className="px-6 pb-4 text-sm text-red-400">Error loading summary: {summaryError}</p>}
      </Card>


      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <strong>Candles (1m)</strong>
              <p className="text-xs text-slate-400">
                Streaming OHLCV view — auto-updates every minute. Latest refresh:{' '}
                {lastChartUpdate ? lastChartUpdate.toLocaleTimeString(undefined, { hour12: false }) : '—'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-slate-400">
                Symbol
                <select
                  className="ml-2 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                >
                  {SYMBOL_OPTIONS.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" variant="ghost" onClick={() => fetchBars(selectedSymbol)} disabled={isChartLoading}>
                {isChartLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3 text-sm mb-4">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Last Close</span>
              <span className="text-lg font-semibold">{latestCandle ? latestCandle.close.toFixed(2) : '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Range</span>
              <span className="text-lg font-semibold">
                {latestCandle ? `${latestCandle.low.toFixed(2)} → ${latestCandle.high.toFixed(2)}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Volume</span>
              <span className="text-lg font-semibold">{latestCandle?.volume ? latestCandle.volume.toLocaleString() : '—'}</span>
            </div>
          </div>
          <div ref={chartContainerRef} className="w-full h-[420px]" />
          {chartError && <p className="mt-3 text-sm text-red-400">Error loading candles: {chartError}</p>}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'red';
}) {
  const accentClass =
    accent === 'green' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-sky-100';
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className={`text-xl font-semibold ${accentClass}`}>{value}</div>
    </div>
  );
}

function formatTooltipTime(time: Time) {
  if (typeof time !== 'number') return '';
  return new Date(time * 1000).toLocaleString(undefined, {
    hour12: false,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value?: number) {
  return typeof value === 'number' ? value.toFixed(2) : '—';
}
