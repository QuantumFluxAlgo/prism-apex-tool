import type { Bar1m, SessionBoundaryFn } from './types.js';

export interface VwapState {
  sessionKey: string | null;
  cumulativePV: number;
  cumulativeVol: number;
}

export function initialVwapState(): VwapState {
  return { sessionKey: null, cumulativePV: 0, cumulativeVol: 0 };
}

export function updateVwap(
  state: VwapState,
  bar: Bar1m,
  sessionKey: string,
): { state: VwapState; vwap: number } {
  const typicalPrice = (bar.high + bar.low + bar.close) / 3;
  if (state.sessionKey !== sessionKey) {
    state = { sessionKey, cumulativePV: 0, cumulativeVol: 0 };
  }
  state.cumulativePV += typicalPrice * bar.volume;
  state.cumulativeVol += bar.volume;
  return { state, vwap: state.cumulativePV / state.cumulativeVol };
}

export function vwapSessionSeries(
  bars: Bar1m[],
  sessionKeyOf: SessionBoundaryFn,
): (number | null)[] {
  let state = initialVwapState();
  const out: (number | null)[] = [];
  for (const bar of bars) {
    if (!isValidBar(bar)) {
      out.push(null);
      continue;
    }
    const key = sessionKeyOf(bar.ts);
    const res = updateVwap(state, bar, key);
    state = res.state;
    out.push(res.vwap);
  }
  return out;
}

function isValidBar(bar: Bar1m): boolean {
  return [bar.open, bar.high, bar.low, bar.close, bar.volume].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
}
