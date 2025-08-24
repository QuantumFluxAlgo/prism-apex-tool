import { Bar, SuggestionResult } from './types.js';

const TICK = 1;
const TARGET_TICKS = 5;

export function osbSuggest(symbol: string, _session: string, bars: Bar[]): SuggestionResult {
  if (bars.length < 2) return { suggestions: [] };
  const prior = bars.slice(0, -1);
  const last = bars[bars.length - 1]!;
  const priorHigh = Math.max(...prior.map((b) => b.high));
  const priorLow = Math.min(...prior.map((b) => b.low));
  if (last.close > priorHigh) {
    return {
      suggestions: [
        {
          id: `osb-${last.ts}`,
          symbol,
          side: 'BUY',
          qty: 1,
          entry: last.close,
          stop: priorLow - TICK,
          targets: [last.close + TARGET_TICKS * TICK],
          reasons: ['OSB breakout'],
        },
      ],
    };
  }
  if (last.close < priorLow) {
    return {
      suggestions: [
        {
          id: `osb-${last.ts}`,
          symbol,
          side: 'SELL',
          qty: 1,
          entry: last.close,
          stop: priorHigh + TICK,
          targets: [last.close - TARGET_TICKS * TICK],
          reasons: ['OSB breakdown'],
        },
      ],
    };
  }
  return { suggestions: [] };
}
