export function guardSize(s, ctx, policy) {
  let qty = s.qty;
  const guardrails = [];
  let sizingHint;
  let consistencyNotes;
  if (policy.halfSizeUntilBuffer && !ctx.bufferCleared) {
    qty = Math.max(1, Math.floor(qty / 2));
    sizingHint = 'half-size-until-buffer';
  }
  if (qty > ctx.accountMax) {
    qty = ctx.accountMax;
    guardrails.push('apex-max');
  }
  if (policy.antiWindfall) {
    const last = ctx.recentSizes[ctx.recentSizes.length - 1];
    if (last && qty > last * 2) {
      return { ok: false, reason: 'windfall' };
    }
  }
  return { ok: true, qty, guardrails, sizingHint, consistencyNotes };
}
