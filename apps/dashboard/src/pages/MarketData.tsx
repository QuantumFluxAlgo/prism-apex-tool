/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// NOTE (Phase 4.2):
// This file is being brought back under TypeScript gradually.
// Chart objects and series will be treated as 'any' while we align the
// Lightweight Charts usage with the proper types in follow-up passes.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart, LineStyle } from 'lightweight-charts';
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

type LogicalBounds = {
  min: number;
  max: number;
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

const SESSION_OPEN_UTC = '23:05';
const SESSION_CLOSE_UTC = '21:55';
const DAY_MS = 24 * 60 * 60 * 1000;
const GRANULARITY_OPTIONS = ['1m', '5m', '15m'] as const;
const ATR_PERIOD = 14;
const LINE_ONLY_SYMBOLS = new Set(['BTC-USD', 'EURUSD=X']);

export default function MarketDataPage() {
  const [summary, setSummary] = useState<MarketDataPayload | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(SYMBOL_OPTIONS[0]);
  const [bars, setBars] = useState<CandlePoint[]>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [lastChartUpdate, setLastChartUpdate] = useState<Date | null>(null);
  const [granularity, setGranularity] = useState<(typeof GRANULARITY_OPTIONS)[number]>('1m');
  const [showVwap, setShowVwap] = useState(true);
  const [showAtr, setShowAtr] = useState(false);
  const [showRange, setShowRange] = useState(false);

const chartContainerRef = useRef<HTMLDivElement | null>(null);
const chartApiRef = useRef<any>(null);
const candleSeriesRef = useRef<any>(null);
const volumeSeriesRef = useRef<any>(null);
const trendLineSeriesRef = useRef<any>(null);
const vwapSeriesRef = useRef<any>(null);
const atrSeriesRef = useRef<any>(null);
const rangeSeriesRef = useRef<any>(null);
const priceLineHostRef = useRef<any>(null);
const lineBaselineRef = useRef<number | null>(null);
const selectedSymbolRef = useRef<string>(SYMBOL_OPTIONS[0]);
const dataBoundsRef = useRef<LogicalBounds | null>(null);
const isAdjustingRangeRef = useRef(false);
const highestPriceLineRef = useRef<any>(null);
const lowestPriceLineRef = useRef<any>(null);
const showVwapRef = useRef(true);
const showAtrRef = useRef(false);
const showRangeRef = useRef(false);

const clampVisibleRangeToData = useCallback(() => {
  const chart = chartApiRef.current;
  const bounds = dataBoundsRef.current;
  if (!chart || !bounds) return;
  const visibleRange = chart.timeScale().getVisibleLogicalRange();
  if (!visibleRange) return;
  const clamped = clampLogicalRange(visibleRange, bounds);
  if (clamped) {
    isAdjustingRangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange(clamped);
  }
}, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MarketDataPayload;
      setSummary(json);
      setSummaryError(null);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchBars = useCallback(
    async (sym: string, resolution: (typeof GRANULARITY_OPTIONS)[number]) => {
      setIsChartLoading(true);
      try {
        const params = new URLSearchParams({ symbol: sym, limit: '720', granularity: resolution });
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
    fetchBars(selectedSymbol, granularity);
    const interval = window.setInterval(() => fetchBars(selectedSymbol, granularity), 60_000);
    return () => window.clearInterval(interval);
  }, [selectedSymbol, granularity, fetchBars]);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  useEffect(() => {
    showVwapRef.current = showVwap;
  }, [showVwap]);

  useEffect(() => {
    showAtrRef.current = showAtr;
  }, [showAtr]);

  useEffect(() => {
    showRangeRef.current = showRange;
  }, [showRange]);

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
      logo: { visible: false },
      watermark: { visible: false },
      timeScale: {
        secondsVisible: false,
        timeVisible: true,
        borderVisible: false,
        tickMarkFormatter: (time: any) =>
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
    } as any) as any;
    // @ts-ignore - Phase 4.2: chart typing shim
    const candleSeries = chart.addCandlestickSeries({ watermark: { visible: false }, 
      upColor: '#16a34a',
      downColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      borderVisible: false,
      priceLineVisible: false,
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    const volumeSeries = chart.addHistogramSeries({
      color: '#38bdf8',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    // @ts-ignore - Phase 4.2: chart typing shim
    const trendLineSeries = chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 1.5,
      priceLineVisible: false,
      visible: false,
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    const vwapSeries = chart.addLineSeries({
      color: '#facc15',
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    const atrSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1.5,
      priceLineVisible: false,
      visible: false,
      priceScaleId: 'atr',
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    const rangeSeries = chart.addHistogramSeries({
      color: '#38bdf8',
      priceScaleId: 'atr',
      priceLineVisible: false,
      visible: false,
      base: 0,
    });
    // @ts-ignore - Phase 4.2: chart typing shim
    chart.priceScale('atr').applyOptions({
      position: 'left',
      scaleMargins: { top: 0.7, bottom: 0 },
      borderVisible: false,
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    trendLineSeriesRef.current = trendLineSeries;
    vwapSeriesRef.current = vwapSeries;
    atrSeriesRef.current = atrSeries;
    rangeSeriesRef.current = rangeSeries;

    const tooltip = document.createElement('div');
    tooltip.className =
      'absolute pointer-events-none rounded-xl bg-slate-900 text-slate-100 text-xs px-3 py-2 shadow-xl border border-slate-700 hidden';
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
      const currentSymbol = selectedSymbolRef.current;
      const isLineSymbol = LINE_ONLY_SYMBOLS.has(currentSymbol);
      const vwapPoint =
        showVwapRef.current && vwapSeriesRef.current
          ? (param.seriesData.get(vwapSeriesRef.current) as { value?: number } | undefined)
          : null;
      const atrPoint =
        showAtrRef.current && atrSeriesRef.current
          ? (param.seriesData.get(atrSeriesRef.current) as { value?: number } | undefined)
          : null;
      const rangePoint =
        showRangeRef.current && rangeSeriesRef.current
          ? (param.seriesData.get(rangeSeriesRef.current) as { value?: number } | undefined)
          : null;

      if (isLineSymbol && trendLineSeriesRef.current) {
        const linePoint = param.seriesData.get(trendLineSeriesRef.current) as { value?: number } | undefined;
        const price = linePoint?.value ?? null;
        if (price === null) {
          tooltip.classList.add('hidden');
          return;
        }
        const baseline = lineBaselineRef.current;
        const delta = computeDelta(price, baseline);
        tooltip.innerHTML = `
          <div class="font-semibold text-slate-200">${formatTooltipTime(param.time)}</div>
          <div>Price ${formatPrice(price)}</div>
          <div>${formatDeltaLabel(delta.change)}</div>
          <div>${formatPercentLabel(delta.percent)}</div>
          ${
            vwapPoint?.value !== undefined
              ? `<div class="mt-1 text-yellow-300">VWAP ${formatPrice(vwapPoint.value)}</div>`
              : ''
          }
          ${
            atrPoint?.value !== undefined
              ? `<div class="text-purple-300">ATR ${formatNumber(atrPoint.value, 2)}</div>`
              : ''
          }
          ${
            rangePoint?.value !== undefined
              ? `<div class="text-sky-300">Range ${formatNumber(rangePoint.value, 2)}</div>`
              : ''
          }
        `;
      } else {
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
          ${
            vwapPoint?.value !== undefined
              ? `<div class="text-yellow-300">VWAP ${formatPrice(vwapPoint.value)}</div>`
              : ''
          }
          ${
            atrPoint?.value !== undefined
              ? `<div class="text-purple-300">ATR ${formatNumber(atrPoint.value, 2)}</div>`
              : ''
          }
          ${
            rangePoint?.value !== undefined
              ? `<div class="text-sky-300">Range ${formatNumber(rangePoint.value, 2)}</div>`
              : ''
          }
        `;
      }
      tooltip.classList.remove('hidden');
      moveTooltip(param.point.x, param.point.y);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = (range: any) => {
      const bounds = dataBoundsRef.current;
      if (!range || !bounds) return;
      if (isAdjustingRangeRef.current) {
        isAdjustingRangeRef.current = false;
        return;
      }
      const clamped = clampLogicalRange(range, bounds);
      if (clamped) {
        isAdjustingRangeRef.current = true;
        timeScale.setVisibleLogicalRange(clamped);
      }
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    const handleResize = () => {
      if (!chartContainerRef.current) return;
      // @ts-ignore - Phase 4.2: chart typing shim
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    const brandingObserver = new MutationObserver(() => stripBranding(chartContainerRef.current));
    stripBranding(chartContainerRef.current);
    brandingObserver.observe(chartContainerRef.current, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      if (highestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(highestPriceLineRef.current);
        highestPriceLineRef.current = null;
      }
      if (lowestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(lowestPriceLineRef.current);
        lowestPriceLineRef.current = null;
      }
      if (trendLineSeriesRef.current) {
        chart.removeSeries(trendLineSeriesRef.current);
        trendLineSeriesRef.current = null;
      }
      if (vwapSeriesRef.current) {
        chart.removeSeries(vwapSeriesRef.current);
        vwapSeriesRef.current = null;
      }
      if (atrSeriesRef.current) {
        chart.removeSeries(atrSeriesRef.current);
        atrSeriesRef.current = null;
      }
      if (rangeSeriesRef.current) {
        chart.removeSeries(rangeSeriesRef.current);
        rangeSeriesRef.current = null;
      }
      priceLineHostRef.current = null;
      brandingObserver.disconnect();
      tooltip.remove();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const candleSeries = candleSeriesRef.current;
    if (bars.length === 0) {
      if (highestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(highestPriceLineRef.current);
        highestPriceLineRef.current = null;
      }
      if (lowestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(lowestPriceLineRef.current);
        lowestPriceLineRef.current = null;
      }
      // @ts-ignore - Phase 4.2: chart typing shim
      trendLineSeriesRef.current?.setData([]);
      // @ts-ignore - Phase 4.2: chart typing shim
      vwapSeriesRef.current?.setData([]);
      // @ts-ignore - Phase 4.2: chart typing shim
      atrSeriesRef.current?.setData([]);
      // @ts-ignore - Phase 4.2: chart typing shim
      rangeSeriesRef.current?.setData([]);
      return;
    }
    const candleData = bars.map((point) => ({
      time: Math.floor(new Date(point.ts).getTime() / 1000),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));
    // @ts-ignore - Phase 4.2: chart typing shim
    candleSeries.setData(candleData);
    dataBoundsRef.current = {
      min: 0,
      max: candleData.length - 1,
    };
    if (volumeSeriesRef.current) {
      const volumeData = bars.map((point) => ({
        time: Math.floor(new Date(point.ts).getTime() / 1000),
        value: point.volume ?? 0,
        color: point.close >= point.open ? '#16a34a55' : '#dc262655',
      }));
      // @ts-ignore - Phase 4.2: chart typing shim
      volumeSeriesRef.current.setData(volumeData);
    }
    const isLineSymbol = LINE_ONLY_SYMBOLS.has(selectedSymbol);
    const priceLineHost =
      isLineSymbol && trendLineSeriesRef.current ? trendLineSeriesRef.current : candleSeries;
    if (priceLineHostRef.current !== priceLineHost) {
      if (highestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(highestPriceLineRef.current);
        highestPriceLineRef.current = null;
      }
      if (lowestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(lowestPriceLineRef.current);
        lowestPriceLineRef.current = null;
      }
      priceLineHostRef.current = priceLineHost;
    }
    if (trendLineSeriesRef.current) {
      // @ts-ignore - Phase 4.2: chart typing shim
      trendLineSeriesRef.current.applyOptions({ visible: isLineSymbol });
      if (isLineSymbol) {
        const baseline = bars[0]?.close ?? null;
        lineBaselineRef.current = baseline ?? null;
        // @ts-ignore - Phase 4.2: chart typing shim
        trendLineSeriesRef.current.applyOptions({
          priceFormat: {
            type: 'custom',
            minMove: 0.0001,
            formatter: (price: number) => formatLineAxis(price, lineBaselineRef.current),
          },
        });
        const trendData = bars.map((point, idx) => {
          const prev = bars[idx - 1];
          const color =
            idx === 0
              ? '#38bdf8'
              : point.close >= (prev?.close ?? point.close)
                ? '#16a34a'
                : '#dc2626';
          return {
            time: Math.floor(new Date(point.ts).getTime() / 1000),
            value: point.close,
            color,
          };
        });
        // @ts-ignore - Phase 4.2: chart typing shim
        trendLineSeriesRef.current.setData(trendData);
      } else {
        // @ts-ignore - Phase 4.2: chart typing shim
        trendLineSeriesRef.current.setData([]);
        lineBaselineRef.current = null;
      }
    }
    if (vwapSeriesRef.current) {
      const vwapData = computeVwapSeries(bars);
      // @ts-ignore - Phase 4.2: chart typing shim
      vwapSeriesRef.current.applyOptions({ visible: showVwap });
      // @ts-ignore - Phase 4.2: chart typing shim
      vwapSeriesRef.current.setData(showVwap ? vwapData : []);
    }
    const { atrPoints, rangePoints } = computeAtrAndRange(bars);
    if (atrSeriesRef.current) {
      // @ts-ignore - Phase 4.2: chart typing shim
      atrSeriesRef.current.applyOptions({ visible: showAtr });
      // @ts-ignore - Phase 4.2: chart typing shim
      atrSeriesRef.current.setData(showAtr ? atrPoints : []);
    }
    if (rangeSeriesRef.current) {
      // @ts-ignore - Phase 4.2: chart typing shim
      rangeSeriesRef.current.applyOptions({ visible: showRange });
      // @ts-ignore - Phase 4.2: chart typing shim
      rangeSeriesRef.current.setData(showRange ? rangePoints : []);
    }
    // @ts-ignore - Phase 4.2: chart typing shim
    candleSeries.applyOptions({ visible: !isLineSymbol });
    const highestHigh = bars.reduce((max, point) => Math.max(max, point.high), -Infinity);
    const lowestLow = bars.reduce((min, point) => Math.min(min, point.low), Infinity);
    if (Number.isFinite(highestHigh) && priceLineHost) {
      if (highestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(highestPriceLineRef.current);
      }
      highestPriceLineRef.current = priceLineHost.createPriceLine({
        price: highestHigh,
        color: '#16a34acc',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: 'High price',
      });
    }
    if (Number.isFinite(lowestLow) && priceLineHost) {
      if (lowestPriceLineRef.current && priceLineHostRef.current) {
        priceLineHostRef.current.removePriceLine(lowestPriceLineRef.current);
      }
      lowestPriceLineRef.current = priceLineHost.createPriceLine({
        price: lowestLow,
        color: '#ef4444cc',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: 'Low price',
      });
    }
    chartApiRef.current?.timeScale().fitContent();
    clampVisibleRangeToData();
  }, [bars, selectedSymbol, showVwap, showAtr, showRange, clampVisibleRangeToData]);

  const latestCandle = bars[bars.length - 1];
  const sessionBounds = useMemo(() => {
    if (!latestCandle) return null;
    return computeSessionBounds(new Date(latestCandle.ts));
  }, [latestCandle]);

  const sessionVolume = useMemo(() => {
    if (!sessionBounds) return { total: null, average: null };
    const startMs = sessionBounds.start.getTime();
    const endMs = sessionBounds.end.getTime();
    const sessionBars = bars.filter((point) => {
      const ts = new Date(point.ts).getTime();
      return ts >= startMs && ts <= endMs;
    });
    if (sessionBars.length === 0) return { total: null, average: null };
    const total = sessionBars.reduce((sum, point) => sum + (point.volume ?? 0), 0);
    const avg = total / sessionBars.length;
    return { total, average: avg };
  }, [bars, sessionBounds]);

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
              <strong>Candles ({granularity})</strong>
              <p className="text-xs text-slate-400">
                Streaming OHLCV view — auto-updates every minute. Latest refresh:{' '}
                {lastChartUpdate ? lastChartUpdate.toLocaleTimeString(undefined, { hour12: false }) : '—'}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
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
              <label className="text-xs text-slate-400">
                Resolution
                <select
                  className="ml-2 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as (typeof GRANULARITY_OPTIONS)[number])}
                >
                  {GRANULARITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchBars(selectedSymbol, granularity)}
                disabled={isChartLoading}
              >
                {isChartLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2 mb-3 text-xs text-slate-400">
            <span className="uppercase tracking-wide">Legend & overlays</span>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showVwap} onChange={(e) => setShowVwap(e.target.checked)} />
                <span>
                  <span className="text-yellow-300 font-semibold">VWAP</span> — volume-weighted mean per session
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showAtr} onChange={(e) => setShowAtr(e.target.checked)} />
                <span>
                  <span className="text-purple-300 font-semibold">ATR</span> — rolling {ATR_PERIOD}-bar true range
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showRange} onChange={(e) => setShowRange(e.target.checked)} />
                <span>
                  <span className="text-sky-300 font-semibold">Range</span> — high/low histogram per bucket
                </span>
              </label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 text-sm mb-4">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Last Close</span>
              <span className="text-lg font-semibold">{latestCandle ? latestCandle.close.toFixed(2) : '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Session Window (UTC)</span>
              <span className="text-lg font-semibold">
                {sessionBounds ? `${formatUtc(sessionBounds.start)} → ${formatUtc(sessionBounds.end)}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wide">Volume</span>
              <span className="text-lg font-semibold">
                {sessionVolume.total !== null ? sessionVolume.total.toLocaleString() : '—'}
              </span>
              <div className="text-xs text-slate-400">
                Avg/min {sessionVolume.average !== null ? sessionVolume.average.toFixed(0) : '—'}
              </div>
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

function formatTooltipTime(time: any) {
  if (typeof time !== 'number') return '';
  return new Date(time * 1000).toLocaleString(undefined, {
    hour12: false,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value?: number, decimals = 2) {
  return typeof value === 'number' ? value.toFixed(decimals) : '—';
}

function computeSessionBounds(ts: Date) {
  const [openH, openM] = parseHm(SESSION_OPEN_UTC);
  const [closeH, closeM] = parseHm(SESSION_CLOSE_UTC);
  let open = Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), openH, openM, 0, 0);
  let close = Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), closeH, closeM, 0, 0);
  if (close <= open) close += DAY_MS;
  const nowMs = ts.getTime();
  if (nowMs < open) {
    open -= DAY_MS;
    close -= DAY_MS;
  }
  return { start: new Date(open), end: new Date(close) };
}

function parseHm(value: string) {
  const [h, m] = value.split(':').map((n) => Number.parseInt(n, 10));
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

function formatUtc(date: Date) {
  return date.toLocaleString(undefined, {
    hour12: false,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const fractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatSigned(value: number, fractionDigits = 2) {
  const sign = value >= 0 ? '+' : '-';
  const magnitude = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${sign}${magnitude}`;
}

function formatDeltaLabel(delta: number | null) {
  if (delta === null) return 'Δ —';
  const fractionDigits = Math.abs(delta) >= 100 ? 2 : Math.abs(delta) >= 1 ? 4 : 6;
  return `Δ ${formatSigned(delta, fractionDigits)}`;
}

function formatPercentLabel(percent: number | null) {
  if (percent === null) return 'Δ% —';
  return `Δ% ${formatSigned(percent, 2)}%`;
}

function computeDelta(price: number | null, baseline: number | null) {
  if (price === null || baseline === null || baseline === 0) {
    return { change: null, percent: null };
  }
  const change = price - baseline;
  const percent = (change / baseline) * 100;
  return { change, percent };
}

function formatLineAxis(price: number, baseline: number | null) {
  const baseLabel = formatPrice(price);
  const delta = computeDelta(price, baseline);
  if (delta.change === null || delta.percent === null) return baseLabel;
  return `${baseLabel} (${formatSigned(delta.change, 2)} / ${formatSigned(delta.percent, 2)}%)`;
}

function computeVwapSeries(points: CandlePoint[]) {
  const result: Array<{ time: number; value: number }> = [];
  const sessionTotals = new Map<string, { pv: number; vol: number }>();
  for (const point of points) {
    const bucketTime = Math.floor(new Date(point.ts).getTime() / 1000);
    const bounds = computeSessionBounds(new Date(point.ts));
    const sessionKey = bounds ? bounds.start.toISOString() : point.ts;
    let totals = sessionTotals.get(sessionKey);
    if (!totals) {
      totals = { pv: 0, vol: 0 };
      sessionTotals.set(sessionKey, totals);
    }
    const volume = point.volume ?? 0;
    if (volume > 0) {
      totals.pv += point.close * volume;
      totals.vol += volume;
    }
    const value = totals.vol > 0 ? totals.pv / totals.vol : point.close;
    result.push({ time: bucketTime, value });
  }
  return result;
}

function computeAtrAndRange(points: CandlePoint[]) {
  const atrPoints: Array<{ time: number; value: number }> = [];
  const rangePoints: Array<{ time: number; value: number; color: string }> = [];
  let prevClose: number | null = null;
  let atrValue: number | null = null;
  points.forEach((point, index) => {
    const time = Math.floor(new Date(point.ts).getTime() / 1000);
    const tr = computeTrueRange(point, prevClose);
    const rangeValue = Math.max(0, point.high - point.low);
    rangePoints.push({
      time,
      value: rangeValue,
      color: point.close >= point.open ? '#16a34a55' : '#dc262655',
    });
    if (tr !== null) {
      if (atrValue === null) {
        atrValue = tr;
      } else if (index < ATR_PERIOD) {
        atrValue = ((atrValue * index) + tr) / (index + 1);
      } else {
        atrValue = ((atrValue * (ATR_PERIOD - 1)) + tr) / ATR_PERIOD;
      }
    }
    atrPoints.push({ time, value: atrValue ?? 0 });
    prevClose = point.close;
  });
  return { atrPoints, rangePoints };
}

function computeTrueRange(point: CandlePoint, prevClose: number | null) {
  const highLow = point.high - point.low;
  if (prevClose === null) return highLow;
  const highClose = Math.abs(point.high - prevClose);
  const lowClose = Math.abs(point.low - prevClose);
  return Math.max(highLow, highClose, lowClose);
}

function clampLogicalRange(range: any, bounds: LogicalBounds): any {
  const { min, max } = bounds;
  if (range.from >= min && range.to <= max) return null;
  const span = max - min;
  if (span <= 0) return null;
  let duration = range.to - range.from;
  if (duration <= 0) duration = Math.min(span, 1);
  if (duration >= span) {
    return { from: min, to: max };
  }
  let nextFrom = range.from;
  let nextTo = range.to;
  if (nextFrom < min) {
    nextFrom = min;
    nextTo = min + duration;
  }
  if (nextTo > max) {
    nextTo = max;
    nextFrom = max - duration;
  }
  nextFrom = Math.max(nextFrom, min);
  nextTo = Math.min(nextTo, max);
  if (nextFrom === range.from && nextTo === range.to) return null;
  return { from: nextFrom, to: nextTo };
}

function stripBranding(container: HTMLDivElement | null) {
  if (!container) return;
  container.querySelectorAll('a').forEach((node) => {
    if (node instanceof HTMLAnchorElement && node.href.includes('tradingview')) {
      node.remove();
    }
  });
}
