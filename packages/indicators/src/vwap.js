export function initialVwapState() {
  return { sessionKey: null, cumulativePV: 0, cumulativeVol: 0 };
}
export function updateVwap(state, bar, sessionKey) {
  const typicalPrice = (bar.high + bar.low + bar.close) / 3;
  if (state.sessionKey !== sessionKey) {
    state = { sessionKey, cumulativePV: 0, cumulativeVol: 0 };
  }
  state.cumulativePV += typicalPrice * bar.volume;
  state.cumulativeVol += bar.volume;
  return { state, vwap: state.cumulativePV / state.cumulativeVol };
}
export function vwapSessionSeries(bars, sessionKeyOf) {
  let state = initialVwapState();
  const out = [];
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
function isValidBar(bar) {
  return [bar.open, bar.high, bar.low, bar.close, bar.volume].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
}
