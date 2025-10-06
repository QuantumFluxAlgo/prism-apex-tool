export type TickSpec = { tickSize: number; tickValue: number };

const SPECS: Record<string, TickSpec> = {
  'ES=F': { tickSize: 0.25, tickValue: 12.5 },
  'NQ=F': { tickSize: 0.25, tickValue: 5.0 },
  'GC=F': { tickSize: 0.1, tickValue: 10.0 },
  'CL=F': { tickSize: 0.01, tickValue: 10.0 },
};

export function getTickSpec(symbol: string): TickSpec {
  return SPECS[symbol] ?? { tickSize: 0.25, tickValue: 5.0 };
}

export function ticksBetween(symbol: string, from?: number | null, to?: number | null) {
  if (from === null || from === undefined || to === null || to === undefined) return null;
  const { tickSize } = getTickSpec(symbol);
  if (!tickSize) return null;
  return Math.round((to - from) / tickSize);
}

export function usdForTicks(symbol: string, ticks?: number | null) {
  if (ticks === null || ticks === undefined) return null;
  const { tickValue } = getTickSpec(symbol);
  return ticks * tickValue;
}

export function tooltipDist(symbol: string, from?: number | null, to?: number | null, label = 'Δ') {
  const ticks = ticksBetween(symbol, from, to);
  if (ticks === null) return '—';
  const usd = usdForTicks(symbol, ticks);
  return `${label}: ${ticks} ticks ($${usd?.toFixed(2)})`;
}

export function tooltipPnL(symbol: string, entry?: number | null, exit?: number | null) {
  const ticks = ticksBetween(symbol, entry, exit);
  if (ticks === null) return '—';
  const { tickValue } = getTickSpec(symbol);
  const usd = usdForTicks(symbol, ticks);
  return `${ticks} ticks × $${tickValue.toFixed(2)} = $${usd?.toFixed(2)}`;
}
