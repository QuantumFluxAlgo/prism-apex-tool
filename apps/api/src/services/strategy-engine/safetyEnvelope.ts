import type { EnginePreviewRequest, EngineSignal } from '../../dto/strategy-engine/index.js';
import { logGovernanceAlert } from '../governance/alert.js';
import type { EngineBar } from './bars.js';

export interface EnvelopeRejected {
  signal: EngineSignal;
  reason: string;
}

export interface EnvelopeResult {
  approved: EngineSignal[];
  rejected: EnvelopeRejected[];
}

const MINIMUM_BARS_REQUIRED = 10;
const ABSURD_PRICE_MAGNITUDE = 1_000_000_000; // guard rails against corrupt data
const ABSURD_PRICE_SPREAD = 5_000_000;
const MAX_SPREAD_RATIO = 1_000; // relative to the absolute price level
const MAX_BAR_HEIGHT_PERCENT = 0.5; // 50% move within a minute is unrealistic for supported markets

interface BarWindow {
  startMs: number;
  endMs: number;
  bar: EngineBar;
}

function parseTimestamp(value: string | undefined | null): number | null {
  if (typeof value !== 'string' || !value.length) {
    return null;
  }
  const date = new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function invalidPrice(value: number | undefined): boolean {
  return (
    typeof value !== 'number' ||
    Number.isNaN(value) ||
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value) > ABSURD_PRICE_MAGNITUDE
  );
}

function buildBarWindows(bars: EngineBar[]): BarWindow[] | null {
  if (!Array.isArray(bars) || bars.length < MINIMUM_BARS_REQUIRED) {
    return null;
  }

  const windows: BarWindow[] = [];
  let previousTimestamp: number | null = null;

  for (let i = 0; i < bars.length; i += 1) {
    const timestamp = parseTimestamp(bars[i].timestamp);
    if (timestamp === null) {
      return null;
    }
    if (previousTimestamp !== null && timestamp <= previousTimestamp) {
      return null;
    }
    const nextTimestamp =
      i < bars.length - 1
        ? parseTimestamp(bars[i + 1].timestamp) ?? timestamp + 60_000
        : timestamp + 60_000;

    windows.push({
      startMs: timestamp,
      endMs: nextTimestamp,
      bar: bars[i],
    });
    previousTimestamp = timestamp;
  }

  return windows;
}

function findBarWindow(timestampMs: number, windows: BarWindow[]): EngineBar | null {
  for (const window of windows) {
    if (timestampMs >= window.startMs && timestampMs < window.endMs) {
      return window.bar;
    }
  }
  return null;
}

function hasAbsurdSpread(entry: number, stop: number, target: number): boolean {
  const maxAbs = Math.max(Math.abs(entry), Math.abs(stop), Math.abs(target));
  const spread = Math.max(
    Math.abs(entry - stop),
    Math.abs(entry - target),
    Math.abs(target - stop),
  );
  const ratioLimit = Math.max(1, maxAbs) * MAX_SPREAD_RATIO;
  return spread > ABSURD_PRICE_SPREAD || spread > ratioLimit;
}

function barHasAnomaly(bar: EngineBar): string | null {
  const range = bar.high - bar.low;
  if (!Number.isFinite(range) || range <= 0) {
    return 'invalid-bar-range';
  }
  if (range > Math.max(1, Math.abs(bar.close)) * MAX_BAR_HEIGHT_PERCENT) {
    return 'bar-range-too-wide';
  }

  if (!Number.isFinite(bar.volume) || bar.volume < 0) {
    return 'invalid-bar-volume';
  }

  return null;
}

export interface SafetyEnvelopeMeta {
  strategy?: EnginePreviewRequest['strategy'];
  symbol?: string;
  sessionDate?: string;
}

export function applySafetyEnvelope(
  signals: EngineSignal[],
  bars: EngineBar[],
  meta: SafetyEnvelopeMeta = {},
): EnvelopeResult {

  const approved: EngineSignal[] = [];
  const rejected: EnvelopeRejected[] = [];

  const windows = buildBarWindows(bars);
  if (!windows) {
    for (const signal of signals) {
      rejected.push({
        signal,
        reason: 'invalid-bar-data',
      });
    }
    return { approved, rejected };
  }

  const sessionStart = windows[0].startMs;
  const sessionEnd = windows[windows.length - 1].endMs;

  let lastTimestampMs: number | null = null;

  for (const signal of signals) {
    const reasons: string[] = [];
    const entryPrice = typeof signal.entryPrice === 'number' ? signal.entryPrice : signal.price;
    const stopPrice = signal.stopPrice;
    const targetPrice = signal.targetPrice;
    const signalPrice = signal.price;

    if (
      invalidPrice(signalPrice) ||
      invalidPrice(entryPrice) ||
      invalidPrice(stopPrice) ||
      invalidPrice(targetPrice)
    ) {
      reasons.push('invalid-price-fields');
    }

    if (
      typeof entryPrice === 'number' &&
      typeof stopPrice === 'number' &&
      typeof targetPrice === 'number' &&
      hasAbsurdSpread(entryPrice, stopPrice, targetPrice)
    ) {
      reasons.push('absurd-price-range');
    }

    const timestampMs = parseTimestamp(signal.timestamp);
    if (timestampMs === null) {
      reasons.push('invalid-timestamp');
    } else {
      if (timestampMs < sessionStart || timestampMs > sessionEnd) {
        reasons.push('timestamp-out-of-range');
      }
      if (lastTimestampMs !== null && timestampMs <= lastTimestampMs) {
        reasons.push('timestamp-non-increasing');
      }
      lastTimestampMs = timestampMs;
    }

    if (
      typeof entryPrice === 'number' &&
      typeof stopPrice === 'number' &&
      typeof targetPrice === 'number'
    ) {
      if (signal.direction === 'LONG') {
        if (!(stopPrice < entryPrice && entryPrice < targetPrice)) {
          reasons.push('invalid-long-ordering');
        }
      } else if (signal.direction === 'SHORT') {
        if (!(targetPrice < entryPrice && entryPrice < stopPrice)) {
          reasons.push('invalid-short-ordering');
        }
      } else {
        reasons.push('unknown-direction');
      }
    }

    if (timestampMs !== null) {
      const bar = findBarWindow(timestampMs, windows);
      if (!bar) {
        reasons.push('missing-bar-context');
      } else {
        const anomaly = barHasAnomaly(bar);
        if (anomaly) {
          reasons.push(anomaly);
        }
      }
    }

    if (reasons.length > 0) {
      rejected.push({
        signal,
        reason: reasons.join(','),
      });
    } else {
      approved.push(signal);
    }
  }

  if (rejected.length > 0) {
    const strategy = typeof meta.strategy === 'string' ? meta.strategy : 'unknown';
    const symbol = typeof meta.symbol === 'string' ? meta.symbol : 'unknown';
    const sessionDate = typeof meta.sessionDate === 'string' ? meta.sessionDate : 'unknown';

    logGovernanceAlert('safety_drops', {
      strategy,
      symbol,
      sessionDate,
      dropCount: rejected.length,
    });
  }

  return { approved, rejected };
}
