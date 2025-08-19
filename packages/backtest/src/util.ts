export function rng(seed = 1) {
  // xorshift32 for determinism
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 0xffffffff);
  };
}

export function withinSession(ts: Date, openHHMM: string, closeHHMM: string, tzOffsetMin = 0): boolean {
  // MVP: assume ts already in UTC; open/close are UTC-aligned strings "HH:MM"
  const [oh, om] = openHHMM.split(':').map(Number);
  const [ch, cm] = closeHHMM.split(':').map(Number);
  const t = ts.getUTCHours() * 60 + ts.getUTCMinutes();
  const o = oh * 60 + om;
  const c = ch * 60 + cm;
  return t >= o && t <= c;
}

export function clampTargetsByR(entry: number, stop: number, targets: number[], maxR: number, side: 'BUY'|'SELL'): number[] {
  const risk = Math.abs(entry - stop);
  return targets.map(t => {
    const r = Math.abs(t - entry) / risk;
    if (r > maxR) {
      const sign = side === 'BUY' ? 1 : -1;
      return entry + sign * maxR * risk;
    }
    return t;
  });
}
