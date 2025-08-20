import type { Tick } from './types';
import type { StrategyAdapter } from '../engine';
import type { BacktestConfig, BacktestResult, Fill } from '../types';
import { SimpleTickFill } from '../fills';
import { rng } from '../util';

export function runTickReplay(ticks: Tick[], strat: StrategyAdapter, cfg: BacktestConfig): BacktestResult {
  // Minimal tick loop: generate signals off last known bar/price via adapter (onBar fallback), or support adapter.onTick if present later.
  const rngf = rng(cfg.rngSeed ?? 1);
  const fills: Fill[] = [];
  const daily: Record<string, { pnl: number; wins: number; losses: number }> = {};
  const ruleBreaches = new Set<string>();

  // naive: synthesize pseudo-bars of 1-second buckets just to reuse adapter.onBar
  let bucket: { open:number; high:number; low:number; close:number; ts:string } | null = null;
  const bucketFlush = () => {
    if (!bucket) return null;
    const b = { ts: bucket.ts, open: bucket.open, high: bucket.high, low: bucket.low, close: bucket.close };
    bucket = null;
    return b;
  };

  const histBars: any[] = [];
  for (const t of ticks) {
    if (!bucket) bucket = { open: t.price, high: t.price, low: t.price, close: t.price, ts: t.ts };
    bucket.high = Math.max(bucket.high, t.price);
    bucket.low = Math.min(bucket.low, t.price);
    bucket.close = t.price;

    // Every N ticks, flush a synthetic bar (MVP N=60)
    if (histBars.length === 0 || histBars.length % 60 === 0) {
      const b = bucketFlush();
      if (b) {
        histBars.push(b);
        const signals = strat.onBar(b as any, histBars.slice());
        for (const s of signals) {
          const startIdx = ticks.findIndex(x => x.ts >= s.ts);
          const trail = startIdx >= 0 ? ticks.slice(startIdx) : [];
          const f = SimpleTickFill.run(trail, s, cfg, rngf);
          if (f) {
            fills.push(f);
            const d = f.exitTs.slice(0, 10);
            const pnl = f.pnl;
            const isWin = pnl > 0;
            daily[d] = daily[d] || { pnl: 0, wins: 0, losses: 0 };
            daily[d].pnl += pnl;
            daily[d][isWin ? 'wins' : 'losses'] += 1;
          }
        }
      }
    }
  }

  const fillsPnl = fills.reduce((a, f) => a + f.pnl, 0);
  const wins = fills.filter(f => f.pnl > 0).length;
  const trades = fills.length;
  const avgR = trades ? fills.reduce((a, f) => a + f.rMultiple, 0) / trades : 0;

  return {
    summary: {
      trades,
      winRate: trades ? wins / trades : 0,
      avgR,
      netPnl: fillsPnl,
      maxDD: 0, // TODO: compute like bar engine
      days: Object.keys(daily).length,
      ruleBreaches: Array.from(ruleBreaches),
    },
    daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })),
    fills,
    meta: { config: cfg, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() },
  };
}
