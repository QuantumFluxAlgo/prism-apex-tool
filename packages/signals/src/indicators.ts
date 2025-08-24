import { Bar } from './types.js';

export function vwap(bars: Bar[]): number[] {
  const out: number[] = [];
  let cumulativePriceVol = 0;
  let cumulativeVol = 0;
  for (const bar of bars) {
    const vol = bar.volume ?? 1;
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumulativePriceVol += typical * vol;
    cumulativeVol += vol;
    out.push(cumulativePriceVol / cumulativeVol);
  }
  return out;
}

export function filterSession(bars: Bar[], start: string, end: string): Bar[] {
  const [sH, sM] = start.split(':').map(Number) as [number, number];
  const [eH, eM] = end.split(':').map(Number) as [number, number];
  return bars.filter((bar) => {
    const d = new Date(bar.ts);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const afterStart = h > sH || (h === sH && m >= sM);
    const beforeEnd = h < eH || (h === eH && m < eM);
    return afterStart && beforeEnd;
  });
}
