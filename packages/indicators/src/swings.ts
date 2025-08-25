import type { Bar1m } from './types.js';

export interface SwingPoint {
  index: number;
  ts: string;
  price: number;
  type: 'PH' | 'PL';
}

export function swings(bars: Bar1m[], k: number): SwingPoint[] {
  if (k < 1) throw new Error('k must be >= 1');
  const res: SwingPoint[] = [];
  for (let i = k; i < bars.length - k; i++) {
    const window = bars.slice(i - k, i + k + 1);
    const highs = window.map((b) => b.high);
    const lows = window.map((b) => b.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    if (bars[i].high === maxHigh && highs.indexOf(maxHigh) === k) {
      res.push({ index: i, ts: bars[i].ts, price: bars[i].high, type: 'PH' });
    }
    if (bars[i].low === minLow && lows.indexOf(minLow) === k) {
      res.push({ index: i, ts: bars[i].ts, price: bars[i].low, type: 'PL' });
    }
  }
  return res;
}
