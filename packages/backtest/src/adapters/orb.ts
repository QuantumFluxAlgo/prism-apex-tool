import type { StrategyAdapter } from '../engine';
import type { Bar, Signal } from '../types';
import { withNoopOnTick } from './common';

/**
 * Opening Range Breakout (ORB) – define first N minutes range; breakout generates a signal.
 * MVP: use first 15 minutes window; 1R stop; 2R target (capped by maxR at engine-level).
 */
export function openingRangeAdapter(rangeMinutes = 15, riskR = 1, targetR = 2): StrategyAdapter {
  let sessionStartDate = '';
  let refHigh = Number.NEGATIVE_INFINITY;
  let refLow = Number.POSITIVE_INFINITY;

  return withNoopOnTick({
    onBar(bar: Bar, hist: Bar[]): Signal[] {
      const date = bar.ts.slice(0, 10);
      const minute = new Date(bar.ts).getUTCMinutes();
      const hour = new Date(bar.ts).getUTCHours();
      const hhmm = hour * 60 + minute;

      const startOfSession = !sessionStartDate || sessionStartDate !== date;
      if (startOfSession) {
        sessionStartDate = date;
        refHigh = Number.NEGATIVE_INFINITY;
        refLow = Number.POSITIVE_INFINITY;
      }

      // Accumulate opening range first N minutes (assuming data starts at session open)
      const barsToday = hist.filter(b => b.ts.slice(0,10) === date);
      if (barsToday.length <= Math.ceil(rangeMinutes)) {
        refHigh = Math.max(refHigh, bar.high);
        refLow = Math.min(refLow, bar.low);
        return [];
      }

      const mid = (refHigh + refLow) / 2;
      const risk = (refHigh - refLow) / 2 || (bar.close * 0.002); // fallback risk
      const signals: Signal[] = [];

      if (bar.high > refHigh) {
        signals.push({
          ts: bar.ts, symbol: 'ORB', side: 'BUY',
          entry: refHigh, stop: refHigh - riskR * risk, targets: [refHigh + targetR * risk], size: 1,
          meta: { refHigh, refLow, type: 'ORB_BREAKOUT_UP' }
        });
      }
      if (bar.low < refLow) {
        signals.push({
          ts: bar.ts, symbol: 'ORB', side: 'SELL',
          entry: refLow, stop: refLow + riskR * risk, targets: [refLow - targetR * risk], size: 1,
          meta: { refHigh, refLow, type: 'ORB_BREAKOUT_DOWN' }
        });
      }
      return signals;
    }
  });
}
