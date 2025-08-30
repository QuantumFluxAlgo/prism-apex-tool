export function withinSuppressionWindow(now, flatByUtc, minutes) {
  const [h, m] = flatByUtc.split(':').map(Number);
  const flat = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m);
  const diff = flat - now.getTime();
  return diff <= minutes * 60_000 && diff >= 0;
}
import { computeRR, guardRR } from './guards/rr.js';
export function evaluateTicket(input, opts) {
  const rr = computeRR({ entry: input.entry, stop: input.stop, target: input.target });
  if (!Number.isFinite(rr)) {
    return { decision: 'reject', reasons: ['invalid risk/reward geometry'] };
  }
  const check = guardRR(rr, opts.minRR, opts.maxRR);
  if (!check.ok) {
    return { decision: 'reject', rr, reasons: [check.reason] };
  }
  const now = opts.now ?? new Date();
  if (withinSuppressionWindow(now, opts.flatByUtc, 0)) {
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
export function suggestPercent(maxContracts, bufferCleared, pctNoBuffer, pctWithBuffer) {
  const pct = bufferCleared ? pctWithBuffer : pctNoBuffer;
  const contracts = Math.floor(maxContracts * pct);
  return { contracts, halfSizeSuggested: !bufferCleared };
}
