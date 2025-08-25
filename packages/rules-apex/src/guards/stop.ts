import { AccountPhase, Suggestion } from '../types.js';

export function guardStop(
  s: Suggestion,
  phase: AccountPhase,
  requireStop: boolean,
): { ok: boolean; reason?: string } {
  if (s.stop == null) {
    if (phase === 'funded' || requireStop) return { ok: false, reason: 'stop-required' };
    return { ok: true };
  }
  if (s.side === 'BUY' && s.stop >= s.entry)
    return { ok: false, reason: 'stop-must-be-below-entry' };
  if (s.side === 'SELL' && s.stop <= s.entry)
    return { ok: false, reason: 'stop-must-be-above-entry' };
  return { ok: true };
}
