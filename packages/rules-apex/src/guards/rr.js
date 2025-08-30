export function computeRR(params) {
  const risk = Math.abs(params.entry - params.stop);
  const reward = Math.abs(params.target - params.entry);
  return reward / risk;
}
export function guardRR(rr, min, max) {
  if (rr < min) return { ok: false, reason: 'rr-too-low' };
  if (rr > max) return { ok: false, reason: 'rr-too-high' };
  return { ok: true };
}
