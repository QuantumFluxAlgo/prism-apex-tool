import type { Bar1m, TickSpec } from './types.js';

export function trueRange(curr: Bar1m, prevClose?: number): number {
  const highLow = curr.high - curr.low;
  if (prevClose === undefined) return highLow;
  return Math.max(highLow, Math.abs(curr.high - prevClose), Math.abs(curr.low - prevClose));
}

export function atrWilderSeries(
  bars: Bar1m[],
  period = 14,
  opts?: { asTicks?: boolean; tickSpec?: TickSpec },
): (number | null)[] {
  const out: (number | null)[] = [];
  let prevClose: number | undefined;
  let atr: number | undefined;
  const trs: number[] = [];
  for (const bar of bars) {
    if (!isValidBar(bar)) {
      out.push(null);
      prevClose = bar.close;
      continue;
    }
    const tr = trueRange(bar, prevClose);
    prevClose = bar.close;
    if (trs.length < period) {
      trs.push(tr);
      if (trs.length === period) {
        atr = trs.reduce((a, b) => a + b, 0) / period;
        out.push(convert(atr, opts));
      } else {
        out.push(null);
      }
    } else {
      atr = ((atr as number) * (period - 1) + tr) / period;
      out.push(convert(atr, opts));
    }
  }
  return out;
}

function convert(value: number, opts?: { asTicks?: boolean; tickSpec?: TickSpec }): number {
  if (opts?.asTicks) {
    const size = opts.tickSpec?.tickSize;
    if (!size) throw new Error('tickSpec.tickSize required when asTicks is true');
    const ticks = value / size;
    return Math.round(ticks * 1e10) / 1e10;
  }
  return value;
}

function isValidBar(bar: Bar1m): boolean {
  return [bar.open, bar.high, bar.low, bar.close, bar.volume].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
}
