export interface RuleResult {
  ok: boolean;
  reason?: string;
}

/**
 * Enforce Apex-style scaling: until the profit buffer is achieved,
 * you can only use up to HALF of the max allowed contracts.
 * - If bufferAchieved === false, allowed = floor(maxContracts/2)
 * - qty must be a positive integer; maxContracts must be >= 1.
 * Fails conservatively on invalid inputs.
 */
export function enforceHalfSizeUntilBuffer(
  qty: number,
  maxContracts: number,
  bufferAchieved: boolean
): RuleResult {
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, reason: 'Invalid qty (must be positive integer)' };
  }
  if (!Number.isInteger(maxContracts) || maxContracts < 1) {
    return { ok: false, reason: 'Invalid maxContracts (must be >= 1 integer)' };
  }

  if (bufferAchieved) {
    // Full size allowed, as long as qty <= maxContracts
    if (qty > maxContracts) {
      return { ok: false, reason: `Qty ${qty} exceeds max contracts ${maxContracts}` };
    }
    return { ok: true };
  }

  const half = Math.max(1, Math.floor(maxContracts / 2));
  if (qty > half) {
    return {
      ok: false,
      reason: `Qty ${qty} exceeds half-size limit ${half} until buffer is achieved`,
    };
  }
  return { ok: true };
}
