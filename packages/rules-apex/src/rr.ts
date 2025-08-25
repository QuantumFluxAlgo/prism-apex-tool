import { TicketInput } from './types.ts';

export function calcRR(input: TicketInput): number {
  const { side, entry, stop, target } = input;
  let risk: number;
  let reward: number;
  if (side === 'long') {
    risk = entry - stop;
    reward = target - entry;
  } else {
    risk = stop - entry;
    reward = entry - target;
  }
  if (risk <= 0 || reward <= 0) return NaN;
  return reward / risk;
}

export function validateRR(
  rr: number,
  minRR: number,
  maxRR: number,
): { ok: boolean; reason?: string } {
  if (rr < minRR) {
    return { ok: false, reason: 'rr below min' };
  }
  if (rr > maxRR) {
    return { ok: false, reason: 'rr above max' };
  }
  return { ok: true };
}
