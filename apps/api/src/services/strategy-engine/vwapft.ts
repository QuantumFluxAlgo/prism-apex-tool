import type { VwapFTConfig } from '../../dto/strategy-config/vwapft.js';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { EngineBar } from './bars.js';

const MIN_BARS = 10;

function normalizePositive(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}

function normalizeDirections(value: string | undefined): 'LONG' | 'SHORT' | 'BOTH' {
  if (value === 'LONG' || value === 'SHORT' || value === 'BOTH') {
    return value;
  }
  return 'BOTH';
}

function normalizeBands(bands: number[] | undefined): number[] {
  if (!Array.isArray(bands)) {
    return [];
  }
  const cleaned = bands
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
    .map((value) => Number(value));
  return Array.from(new Set(cleaned)).sort((a, b) => a - b);
}

function accumulateVwap(bars: EngineBar[]): number[] {
  const values: number[] = [];
  let cumulativePv = 0;
  let cumulativeVolume = 0;

  for (const bar of bars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const volume = Number.isFinite(bar.volume) ? Number(bar.volume) : 0;
    cumulativePv += typicalPrice * volume;
    cumulativeVolume += volume;
    if (cumulativeVolume > 0) {
      values.push(cumulativePv / cumulativeVolume);
    } else {
      values.push(typicalPrice);
    }
  }

  return values;
}

function parseSessionWindow(window: string | undefined | null):
  | { startMinutes: number; endMinutes: number }
  | null {
  if (!window || typeof window !== 'string') {
    return null;
  }
  const parts = window.split('-');
  if (parts.length !== 2) {
    return null;
  }
  const parsePart = (value: string): number | null => {
    const match = value.trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      return null;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const startMinutes = parsePart(parts[0]);
  const endMinutes = parsePart(parts[1]);
  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes < 0 ||
    endMinutes > 24 * 60 ||
    startMinutes >= endMinutes
  ) {
    return null;
  }
  return { startMinutes, endMinutes };
}

function extractMinutesFromTimestamp(timestamp: string): number | null {
  const match = timestamp.match(/T(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function runVwapFtStrategy(bars: EngineBar[], config: VwapFTConfig): EngineSignal[] {
  if (!bars.length || bars.length < MIN_BARS) {
    return [];
  }

  const deviationBands = normalizeBands(config.deviationBands);
  if (!deviationBands.length) {
    return [];
  }

  const minAtr = normalizePositive(config.minATR, 0);
  const allowedDirections = normalizeDirections(config.allowedDirections);
  const lookbackPeriod = Math.floor(normalizePositive(config.lookbackPeriod, 0));
  const windowDefinition = parseSessionWindow(config.sessionWindow);

  let workingBars = bars;
  if (windowDefinition) {
    const filtered = bars.filter((bar) => {
      const minutes = extractMinutesFromTimestamp(bar.timestamp);
      if (minutes === null) {
        return false;
      }
      return minutes >= windowDefinition.startMinutes && minutes <= windowDefinition.endMinutes;
    });
    if (filtered.length < MIN_BARS) {
      return [];
    }
    workingBars = filtered;
  }

  const sessionHigh = Math.max(...workingBars.map((bar) => bar.high));
  const sessionLow = Math.min(...workingBars.map((bar) => bar.low));
  const sessionRange = sessionHigh - sessionLow;
  if (!Number.isFinite(sessionRange) || sessionRange <= 0) {
    return [];
  }

  if (minAtr > 0 && sessionRange < minAtr) {
    return [];
  }

  const vwapSeries = accumulateVwap(workingBars);

  let signalIndex: number | null = null;
  let signalDirection: 'LONG' | 'SHORT' | null = null;
  let bandTouched: number | null = null;

  const totalBars = workingBars.length;
  const scanStart = lookbackPeriod > 0 ? Math.max(1, totalBars - lookbackPeriod) : 1;

  for (let i = scanStart; i < totalBars; i += 1) {
    const bar = workingBars[i];
    const prevBar = workingBars[i - 1];
    const nextBar = i + 1 < totalBars ? workingBars[i + 1] : null;
    const vwap = vwapSeries[i];

    for (const bandFactor of deviationBands) {
      const upperBand = vwap * (1 + bandFactor);
      const lowerBand = vwap * (1 - bandFactor);

      const canLong = allowedDirections === 'LONG' || allowedDirections === 'BOTH';
      const canShort = allowedDirections === 'SHORT' || allowedDirections === 'BOTH';

      if (canLong) {
        const touchedLower =
          bar.low <= lowerBand ||
          prevBar.low <= lowerBand;
        const reclaimed =
          bar.close >= lowerBand ||
          (nextBar && nextBar.close >= lowerBand);
        if (touchedLower && reclaimed) {
          signalIndex = i;
          signalDirection = 'LONG';
          bandTouched = lowerBand;
          break;
        }
      }

      if (canShort) {
        const touchedUpper =
          bar.high >= upperBand ||
          prevBar.high >= upperBand;
        const rejected =
          bar.close <= upperBand ||
          (nextBar && nextBar.close <= upperBand);
        if (touchedUpper && rejected) {
          signalIndex = i;
          signalDirection = 'SHORT';
          bandTouched = upperBand;
          break;
        }
      }
    }

    if (signalIndex !== null) {
      break;
    }
  }

  if (signalIndex === null || signalDirection === null || bandTouched === null) {
    return [];
  }

  const triggerBar = workingBars[signalIndex];
  const entryPrice = triggerBar.close;
  if (!Number.isFinite(entryPrice)) {
    return [];
  }

  const windowStart = Math.max(0, signalIndex - 3);
  const windowSlice = workingBars.slice(windowStart, signalIndex + 1);

  let stopPrice: number;
  let targetPrice: number;

  if (signalDirection === 'LONG') {
    const localLow = Math.min(...windowSlice.map((bar) => bar.low));
    stopPrice = Math.min(localLow, bandTouched);
    const risk = entryPrice - stopPrice;
    if (!Number.isFinite(risk) || risk <= 0) {
      return [];
    }
    targetPrice = entryPrice + risk;
    if (!(stopPrice < entryPrice && entryPrice < targetPrice)) {
      return [];
    }
  } else {
    const localHigh = Math.max(...windowSlice.map((bar) => bar.high));
    stopPrice = Math.max(localHigh, bandTouched);
    const risk = stopPrice - entryPrice;
    if (!Number.isFinite(risk) || risk <= 0) {
      return [];
    }
    targetPrice = entryPrice - risk;
    if (!(targetPrice < entryPrice && entryPrice < stopPrice)) {
      return [];
    }
  }

  const bandInfo = bandTouched.toFixed(2);
  const rangeInfo = sessionRange.toFixed(2);
  const minAtrInfo = minAtr.toFixed(2);
  const lookbackInfo = lookbackPeriod > 0 ? `, lookback=${lookbackPeriod}` : '';
  const windowInfo = windowDefinition ? `, window=${config.sessionWindow}` : '';
  const reason = `VWAP-FT ${signalDirection.toLowerCase()}: first touch band=${bandInfo} (range=${rangeInfo}, minATR=${minAtrInfo}, bands=${deviationBands.join(
    ',',
  )}, dirs=${allowedDirections}${lookbackInfo}${windowInfo})`;

  return [
    {
      id: `vwapft-${triggerBar.timestamp}`,
      timestamp: triggerBar.timestamp,
      direction: signalDirection,
      price: entryPrice,
      entryPrice,
      stopPrice,
      targetPrice,
      reason,
    },
  ];
}
