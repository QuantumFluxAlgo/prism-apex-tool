/**
 * Generic validator for per-strategy config objects.
 * It does not assume exact key names; instead it enforces:
 *  - keys are strings
 *  - values are finite numbers (or ISO strings for obvious time fields)
 *  - basic non-negative constraints for lookbacks/cooldowns/ticks/bars/minutes
 *  - OPTIONAL: reject unknown keys vs a provided "allowed" list (when you pass it)
 */
export interface StrategyValidationOptions {
  allowedKeys?: string[]; // when provided, keys must be subset of this list
}

export function validateStrategyConfig(
  obj: unknown,
  opts: StrategyValidationOptions = {},
): Record<string, number | string> {
  if (typeof obj !== 'object' || obj === null) throw new Error('strategy config: not an object');
  const out: Record<string, number | string> = {};
  const allowed = opts.allowedKeys ? new Set(opts.allowedKeys) : null;

  for (const [k, v] of Object.entries(obj as any)) {
    if (allowed && !allowed.has(k)) {
      throw new Error(`strategy config: unknown key "${k}"`);
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new Error(`strategy config: "${k}" must be a finite number`);
      // heuristic non-negative for durations/counts
      if (/(bars?|minutes?|ticks?|lookback|cooldown|count|period|window)$/i.test(k) && v < 0) {
        throw new Error(`strategy config: "${k}" must be >= 0`);
      }
      out[k] = v;
      continue;
    }
    if (typeof v === 'string') {
      // allow session/time strings e.g., "09:30" or "16:00"
      if (/(time|start|end)$/i.test(k)) {
        if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) {
          throw new Error(`strategy config: "${k}" must be "HH:MM" or "HH:MM:SS"`);
        }
        out[k] = v;
        continue;
      }
      // otherwise reject strings
      throw new Error(`strategy config: "${k}" must be a finite number`);
    }
    throw new Error(`strategy config: "${k}" must be a finite number`);
  }
  return out;
}
