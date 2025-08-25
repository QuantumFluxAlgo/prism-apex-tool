import { Suggestion } from '../types.js';

export type SizeContext = {
  bufferCleared: boolean;
  accountMax: number;
  recentSizes: number[];
};

export type SizePolicy = {
  halfSizeUntilBuffer: boolean;
  antiWindfall: boolean;
};

export function guardSize(
  s: Suggestion,
  ctx: SizeContext,
  policy: SizePolicy,
):
  | { ok: true; qty: number; guardrails: string[]; sizingHint?: string; consistencyNotes?: string }
  | { ok: false; reason: string } {
  let qty = s.qty;
  const guardrails: string[] = [];
  let sizingHint: string | undefined;
  let consistencyNotes: string | undefined;

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
