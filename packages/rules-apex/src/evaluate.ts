import { TicketInput, EvaluateResult } from './types.js';
import { calcRR, validateRR } from './rr.js';
import { isAfterFlat } from './curfew.js';

export function evaluateTicket(
  input: TicketInput,
  opts: { minRR: number; maxRR: number; flatByUtc: string; now?: Date },
): EvaluateResult {
  const rr = calcRR(input);
  if (!Number.isFinite(rr)) {
    return { decision: 'reject', reasons: ['invalid risk/reward geometry'] };
  }

  const check = validateRR(rr, opts.minRR, opts.maxRR);
  if (!check.ok) {
    return { decision: 'reject', rr, reasons: [check.reason!] };
  }

  const now = opts.now ?? new Date();
  if (isAfterFlat(now, opts.flatByUtc)) {
    return { decision: 'reject', rr, reasons: ['eod flat cutoff'] };
  }

  return {
    decision: 'accept',
    rr,
    reasons: [],
    normalized: input,
    suggestions: { halfSizeSuggested: false },
  };
}
