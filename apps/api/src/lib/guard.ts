import { getConfig } from '../config/env';
import { evaluateTicket, withinSuppressionWindow, TicketInput } from '@prism-apex-tool/rules-apex';

export type GuardDecision =
  | { accepted: true; rr: number; reasons: string[] }
  | { accepted: false; rr?: number; reasons: string[] };

const SUPPRESS_MIN_BEFORE = 5; // decision: suppress new entries for last 5 min pre-cutoff

export function applyGuardrails(input: TicketInput, now = new Date()): GuardDecision {
  const cfg = getConfig();
  // 5-min pre-close suppression
  if (withinSuppressionWindow(now, cfg.time.flatByUtc, SUPPRESS_MIN_BEFORE)) {
    return { accepted: false, reasons: ['pre-close suppression window'] };
  }
  const res = evaluateTicket(input, {
    minRR: cfg.guardrails.minRR,
    maxRR: cfg.guardrails.maxRR,
    flatByUtc: cfg.time.flatByUtc,
    now,
  });
  if (res.decision === 'reject') return { accepted: false, rr: res.rr, reasons: res.reasons };
  return { accepted: true, rr: res.rr, reasons: [] };
}
