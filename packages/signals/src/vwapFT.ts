import { Bar, SuggestionResult } from './types.js';
import { vwap } from './indicators.js';

const TICK = 1;
const TARGET_TICKS = 5;
const STOP_BUFFER = 1;

export function vwapFirstTouchSuggest(symbol: string, bars: Bar[]): SuggestionResult {
  if (bars.length < 2) return { suggestions: [] };
  const vw = vwap(bars);
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1]!;
    const curr = bars[i]!;
    if (prev.close < vw[i - 1]! && curr.close >= vw[i]!) {
      return {
        suggestions: [
          {
            id: `vwapft-${curr.ts}`,
            symbol,
            side: 'BUY',
            qty: 1,
            entry: curr.close,
            stop: curr.low - STOP_BUFFER,
            targets: [curr.close + TARGET_TICKS * TICK],
            reasons: ['VWAP first touch'],
          },
        ],
      };
    }
    if (prev.close > vw[i - 1]! && curr.close <= vw[i]!) {
      return {
        suggestions: [
          {
            id: `vwapft-${curr.ts}`,
            symbol,
            side: 'SELL',
            qty: 1,
            entry: curr.close,
            stop: curr.high + STOP_BUFFER,
            targets: [curr.close - TARGET_TICKS * TICK],
            reasons: ['VWAP first touch'],
          },
        ],
      };
    }
  }
  return { suggestions: [] };
}
