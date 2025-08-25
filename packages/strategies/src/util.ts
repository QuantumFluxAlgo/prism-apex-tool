export const last = <T>(arr: T[]) => arr[arr.length - 1];
export function rMultiple(entry: number, stop: number, target: number) {
  const risk = Math.abs(entry - stop);
  return risk > 0 ? Math.abs(target - entry) / risk : 0;
}
export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
export function pricePlusTicks(price: number, ticks: number, tickSize: number) {
  return price + ticks * tickSize;
}
export function ticksBetween(a: number, b: number, tickSize: number) {
  return Math.round(Math.abs(a - b) / tickSize);
}
