import { getSpecByYahooSymbol } from '@prism-apex/shared/contracts';

export type TickSpec = {
  tickSize: number | null;
  tickValue: number | null;
  verified: boolean;
};

const FALLBACK_SPEC: TickSpec = { tickSize: 0.25, tickValue: 5.0, verified: false };

const SEEDED_SPECS: Record<string, TickSpec> = {
  'ES=F': { tickSize: 0.25, tickValue: 12.5, verified: false },
  'NQ=F': { tickSize: 0.25, tickValue: 5.0, verified: false },
  'GC=F': { tickSize: 0.1, tickValue: 10.0, verified: false },
  'CL=F': { tickSize: 0.01, tickValue: 10.0, verified: false },
};

const cache = new Map<string, TickSpec>(Object.entries(SEEDED_SPECS));
const inFlight = new Map<string, Promise<void>>();

function clone(spec: TickSpec): TickSpec {
  return { ...spec };
}

async function hydrateSpec(symbol: string): Promise<void> {
  if (inFlight.has(symbol)) return inFlight.get(symbol)!;

  const promise = getSpecByYahooSymbol(symbol)
    .then((spec) => {
      if (spec && spec.tickSize && spec.tickValueUSD) {
        cache.set(symbol, {
          tickSize: spec.tickSize,
          tickValue: spec.tickValueUSD,
          verified: Boolean(spec.tickSpecVerified),
        });
      }
    })
    .catch(() => {
      // Swallow errors; callers fall back to cached/default specs.
    })
    .finally(() => {
      inFlight.delete(symbol);
    });

  inFlight.set(symbol, promise);
  return promise;
}

function ensureSpec(symbol: string): TickSpec {
  if (!cache.has(symbol)) {
    cache.set(symbol, clone(FALLBACK_SPEC));
    void hydrateSpec(symbol);
  } else {
    const current = cache.get(symbol);
    if (current && !current.verified) {
      void hydrateSpec(symbol);
    }
  }
  return cache.get(symbol) ?? clone(FALLBACK_SPEC);
}

export function prefetchTickSpec(symbol: string): void {
  if (!symbol) return;
  void hydrateSpec(symbol);
}

export function getTickSpec(symbol: string): TickSpec {
  if (!symbol) return clone(FALLBACK_SPEC);
  return clone(ensureSpec(symbol));
}

export function ticksBetween(symbol: string, from?: number | null, to?: number | null): number | null {
  if (from === null || from === undefined || to === null || to === undefined) return null;
  const { tickSize, verified } = getTickSpec(symbol);
  if (!verified || typeof tickSize !== 'number' || !Number.isFinite(tickSize) || tickSize === 0) {
    return null;
  }
  return Math.round((to - from) / tickSize);
}

export function usdForTicks(symbol: string, ticks?: number | null): number | null {
  if (ticks === null || ticks === undefined) return null;
  const { tickValue, verified } = getTickSpec(symbol);
  if (!verified || typeof tickValue !== 'number' || !Number.isFinite(tickValue)) return null;
  return ticks * tickValue;
}

export function tooltipDist(symbol: string, from?: number | null, to?: number | null, label = 'Δ'): string {
  const ticks = ticksBetween(symbol, from, to);
  if (ticks === null) return 'Tick spec pending verification';
  const { tickValue } = getTickSpec(symbol);
  if (typeof tickValue !== 'number' || !Number.isFinite(tickValue)) return 'Tick spec incomplete';
  const usd = ticks * tickValue;
  return `${label}: ${ticks} ticks × $${tickValue.toFixed(2)} = $${usd.toFixed(2)}`;
}

export function tooltipPnL(symbol: string, entry?: number | null, exit?: number | null): string {
  const ticks = ticksBetween(symbol, entry, exit);
  if (ticks === null) return 'Tick spec pending verification';
  const { tickValue } = getTickSpec(symbol);
  if (typeof tickValue !== 'number' || !Number.isFinite(tickValue)) return 'Tick spec incomplete';
  const usd = ticks * tickValue;
  return `${ticks} ticks × $${tickValue.toFixed(2)} = $${usd.toFixed(2)}`;
}
