export const last = (arr) => arr[arr.length - 1];
export function rMultiple(entry, stop, target) {
  const risk = Math.abs(entry - stop);
  return risk > 0 ? Math.abs(target - entry) / risk : 0;
}
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
export function pricePlusTicks(price, ticks, tickSize) {
  return price + ticks * tickSize;
}
export function ticksBetween(a, b, tickSize) {
  return Math.round(Math.abs(a - b) / tickSize);
}
