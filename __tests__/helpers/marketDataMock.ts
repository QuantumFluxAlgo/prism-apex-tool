/**
 * Deterministic market-data utilities for unit tests.
 * - Generates synthetic OHLC bars and a simple VWAP series
 * - No timers/IO; purely synchronous for predictable tests
 */

export interface Bar {
  time: number;  // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function genBars(count: number, startPrice = 100, startTime = Date.UTC(2025, 0, 1, 0, 0, 0)): Bar[] {
  const bars: Bar[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const drift = Math.sin(i / 5) * 0.5;
    const noise = ((i * 9301 + 49297) % 233280) / 233280 - 0.5; // pseudo-rand [-0.5, 0.5)
    const move = drift + noise * 0.25;
    const close = +(open + move).toFixed(2);
    const high = Math.max(open, close) + 0.2;
    const low = Math.min(open, close) - 0.2;
    const volume = 100 + (i % 20);
    bars.push({
      time: startTime + i * 60_000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close,
      volume,
    });
    price = close;
  }
  return bars;
}

export function genVWAP(bars: Bar[]): number[] {
  const vwap: number[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (const b of bars) {
    const typical = (b.high + b.low + b.close) / 3;
    cumPV += typical * b.volume;
    cumV += b.volume;
    vwap.push(+(cumPV / cumV).toFixed(4));
  }
  return vwap;
}
