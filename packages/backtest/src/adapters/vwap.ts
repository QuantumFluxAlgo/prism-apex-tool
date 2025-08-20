import type { StrategyAdapter } from '../engine';
import type { Bar, Signal } from '../types';
import { withNoopOnTick } from './common';

/**
 * VWAP Pullback – naive MVP: if price is below a rolling VWAP => consider BUY on pullback to VWAP; reverse for SELL.
 * Here we approximate VWAP with cumulative (sum(price*vol)/sum(vol)); if volume absent, use EMA proxy.
 */
export function vwapAdapter(window = 60, riskTicks = 4, targetTicks = 8): StrategyAdapter {
  const state = { pv: 0, vol: 0, ema: 0, alpha: 2 / (window + 1) };

  return withNoopOnTick({
    onBar(bar: Bar, hist: Bar[]): Signal[] {
      const px = bar.close;
      let vwap = state.ema;
      if (typeof bar.volume === 'number' && bar.volume > 0) {
        state.pv += px * bar.volume;
        state.vol += bar.volume;
        vwap = state.pv / Math.max(1, state.vol);
      } else {
        state.ema = state.ema === 0 ? px : (state.alpha * px + (1 - state.alpha) * state.ema);
        vwap = state.ema;
      }

      const signals: Signal[] = [];
      // BUY pullback: price crosses above vwap after being below
      const prev = hist[hist.length - 2]?.close ?? px;
      if (prev < vwap && px > vwap) {
        signals.push({ ts: bar.ts, symbol: 'VWAP', side: 'BUY', entry: px, stop: px - riskTicks, targets: [px + targetTicks], size: 1, meta: { vwap } });
      }
      // SELL pullback: price crosses below vwap after being above
      if (prev > vwap && px < vwap) {
        signals.push({ ts: bar.ts, symbol: 'VWAP', side: 'SELL', entry: px, stop: px + riskTicks, targets: [px - targetTicks], size: 1, meta: { vwap } });
      }
      return signals;
    }
  });
}
