import type { Ticket } from '../../shared/src/types';

/**
 * Guardrail: Apex requires a stop-loss on every trade.
 * Returns OK if a valid stop is present and distinct from entry; FAIL otherwise.
 */
export interface RuleResult {
  ok: boolean;
  reason?: string;
}

export function checkStopRequired(ticket: Ticket): RuleResult {
  const entry = ticket?.order?.entry;
  const stop = ticket?.order?.stop;

  if (typeof entry !== 'number' || !Number.isFinite(entry)) {
    return { ok: false, reason: 'Invalid entry price' };
  }
  if (typeof stop !== 'number' || !Number.isFinite(stop)) {
    return { ok: false, reason: 'Stop-loss is required' };
  }
  if (stop === entry) {
    return { ok: false, reason: 'Stop-loss cannot equal entry' };
  }
  // Additional sanity: stop cannot be negative or zero in futures price terms
  if (stop <= 0) {
    return { ok: false, reason: 'Stop-loss must be > 0' };
  }
  return { ok: true };
}
