export function computeRR(params: { entry: number; stop: number; target: number }): number {
  const risk = Math.abs(params.entry - params.stop);
  const reward = Math.abs(params.target - params.entry);
  return reward / risk;
}

export function guardRR(rr: number, min: number, max: number): { ok: boolean; reason?: string } {
  if (rr < min) return { ok: false, reason: 'rr-too-low' };
  if (rr > max) return { ok: false, reason: 'rr-too-high' };
  return { ok: true };
}
