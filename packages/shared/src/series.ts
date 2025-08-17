import type { Bar } from './types.js';

function inWindow(bar: Bar, start: Date, end: Date): boolean {
  const ts = Date.parse(bar.ts);
  return ts >= start.getTime() && ts <= end.getTime();
}

/** Compute opening range high/low from bars between [start, end]. */
export function openingRange(
  bars: readonly Bar[],
  start: Date,
  end: Date,
): { high: number; low: number } {
  const window = bars.filter((b) => inWindow(b, start, end));
  if (window.length === 0) {
    throw new Error('No bars in range for opening range');
  }
  let high = -Infinity;
  let low = Infinity;
  for (const b of window) {
    if (b.h > high) high = b.h;
    if (b.l < low) low = b.l;
  }
  return { high, low };
}

/** Compute session VWAP from bars in [start, end] using sum(P*V)/sum(V). */
export function sessionVWAP(bars: readonly Bar[], start: Date, end: Date): number {
  const window = bars.filter((b) => inWindow(b, start, end));
  if (window.length === 0) {
    throw new Error('No bars in range for VWAP');
  }
  let sumPV = 0;
  let sumV = 0;
  for (const b of window) {
    const typical = (b.h + b.l + b.c) / 3;
    sumPV += typical * b.v;
    sumV += b.v;
  }
  if (sumV === 0) {
    throw new Error('Total volume is zero for VWAP');
  }
  return sumPV / sumV;
}
