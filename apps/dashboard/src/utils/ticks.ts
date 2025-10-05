type Spec = { tickSize: number; tickValue: number };

const FUTURES: Record<string, Spec> = {
  'ES=F': { tickSize: 0.25, tickValue: 12.5 },
  'NQ=F': { tickSize: 0.25, tickValue: 5 },
  'GC=F': { tickSize: 0.1, tickValue: 10 },
  'CL=F': { tickSize: 0.01, tickValue: 10 },
};

export function getSpec(symbol: string): Spec {
  return FUTURES[symbol] ?? { tickSize: 0.25, tickValue: 5 };
}

export function ticksBetween(symbol: string, from?: number | null, to?: number | null) {
  if (from === null || from === undefined || to === null || to === undefined) return null;
  const { tickSize } = getSpec(symbol);
  if (tickSize === 0) return null;
  const raw = (to - from) / tickSize;
  return Math.round(raw);
}

export function usdFromTicks(symbol: string, ticks: number | null) {
  if (ticks === null || ticks === undefined) return null;
  const { tickValue } = getSpec(symbol);
  return ticks * tickValue;
}

export function tooltipDist(symbol: string, from?: number | null, to?: number | null, label = 'Δ') {
  const ticks = ticksBetween(symbol, from, to);
  if (ticks === null) return '—';
  const usd = usdFromTicks(symbol, ticks);
  return `${label}: ${ticks} ticks ($${usd?.toFixed(2)})`;
}

export function tooltipPnL(symbol: string, entry?: number | null, exit?: number | null) {
  const ticks = ticksBetween(symbol, entry, exit);
  if (ticks === null) return '—';
  const { tickValue } = getSpec(symbol);
  const usd = usdFromTicks(symbol, ticks);
  return `${ticks} ticks × $${tickValue.toFixed(2)} = $${usd?.toFixed(2)}`;
}
