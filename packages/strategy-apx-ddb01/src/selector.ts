export type LongOnlyPlan = {
  side: 'Buy';
  entry: number;
  stopTicks: number;
  rr: number;
  notes: string;
};

export function planLongOnlyRetest(args: {
  tickSize: number; // e.g., 0.25 (MES)
  currentPrice: number; // latest price (delayed OK)
  weeklyVwap: number; // weekly anchored VWAP value
  priorHigh: number; // yesterday's RTH High
  bufferTicks: number; // small cushion (e.g., 2)
  minStopTicks: number; // product floor (e.g., MES 12)
  rr: number; // requested RR (min 2)
}): LongOnlyPlan | null {
  const { tickSize, currentPrice, weeklyVwap, priorHigh, bufferTicks, minStopTicks } = args;
  const rr = Math.max(2, args.rr ?? 2);

  // Bias: long-only when price >= weekly VWAP, else no trade
  if (!(currentPrice >= weeklyVwap)) return null;

  // Entry = retest of priorHigh minus buffer
  const entry = roundToTick(priorHigh - bufferTicks * tickSize, tickSize);

  // Stop: at least minStopTicks below entry
  const stopTicks = Math.max(minStopTicks, bufferTicks);

  return {
    side: 'Buy',
    entry,
    stopTicks,
    rr,
    notes: 'APX-DDB-01 long-only: prior RTH High retest with weekly VWAP bias up',
  };
}

function roundToTick(price: number, tick: number): number {
  return Number((Math.round(price / tick) * tick).toFixed(10));
}
