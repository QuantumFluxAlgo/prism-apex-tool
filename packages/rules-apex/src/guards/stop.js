export function guardStop(s, phase, requireStop) {
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
