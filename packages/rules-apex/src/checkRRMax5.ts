import type { Ticket } from '../../shared/src/types';

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

/**
 * Guardrail: Apex-funded trading must not exceed 5:1 reward-to-risk on any target.
 * Returns OK if ALL targets are <= 5.0 R; FAIL otherwise.
 * Handles BUY/SELL symmetrically and validates inputs defensively.
 */
export function checkRRMax5(ticket: Ticket): RuleResult {
  const side = ticket?.side;
  const entry = ticket?.order?.entry;
  const stop = ticket?.order?.stop;
  const targets = ticket?.order?.targets;

  // Validate basics
  if (side !== 'BUY' && side !== 'SELL') {
    return { ok: false, reason: 'Invalid side' };
  }
  if (typeof entry !== 'number' || !Number.isFinite(entry)) {
    return { ok: false, reason: 'Invalid entry price' };
  }
  if (typeof stop !== 'number' || !Number.isFinite(stop)) {
    return { ok: false, reason: 'Invalid stop price' };
  }
  if (!Array.isArray(targets) || targets.length === 0) {
    return { ok: false, reason: 'At least one target is required' };
  }
  if (!targets.every(t => typeof t === 'number' && Number.isFinite(t))) {
    return { ok: false, reason: 'Invalid target price detected' };
  }

  // Compute risk > 0
  const risk = side === 'BUY' ? entry - stop : stop - entry;
  if (!(risk > 0)) {
    return { ok: false, reason: 'Risk must be > 0 (check entry/stop relationship)' };
  }

  // Check each target's R multiple
  for (const target of targets) {
    const reward = side === 'BUY' ? target - entry : entry - target;
    const rMultiple = reward / risk;

    // If reward <= 0, it is not a violation of >5:1, but it’s nonsensical for a target; treat as fail for safety.
    if (!(reward > 0)) {
      return { ok: false, reason: 'Target must be beyond entry in the favorable direction' };
    }

    // Violation if ANY target exceeds 5.0 R
    if (rMultiple > 5.0 + Number.EPSILON) {
      return { ok: false, reason: `Risk/Reward exceeds 5:1 (found ${rMultiple.toFixed(3)}R)` };
    }
  }

  return { ok: true };
}
