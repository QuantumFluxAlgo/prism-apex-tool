export type AVWAPState = { tpv: number; vol: number; anchorISO: string };
export function initAVWAP(anchorISO: string): AVWAPState {
  return { tpv: 0, vol: 0, anchorISO };
}
export function stepAVWAP(s: AVWAPState, h: number, l: number, c: number, v: number): AVWAPState {
  const tp = (h + l + c) / 3;
  const vv = Math.max(0, v | 0);
  return { ...s, tpv: s.tpv + tp * vv, vol: s.vol + vv };
}
export function valueAVWAP(s: AVWAPState) {
  return s.vol > 0 ? s.tpv / s.vol : NaN;
}
