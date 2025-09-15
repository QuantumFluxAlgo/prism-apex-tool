import { getConfig } from '../config/env';
import {
  evaluateTicket,
  withinSuppressionWindow,
  TicketInput,
  suggestPercent,
} from '@prism-apex/rules-apex';
import { Accounts } from './accounts';

export type GuardSizing = {
  allowed?: number;
  halfSizeSuggested?: boolean;
  jumpExceeded?: boolean;
};

export type GuardDecision =
  | { accepted: true; rr: number; reasons: string[]; sizing?: GuardSizing }
  | { accepted: false; rr?: number; reasons: string[]; sizing?: GuardSizing };

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

export async function applyGuardWithSizing(
  input: TicketInput & { accountId?: string; qty?: number },
  now = new Date(),
): Promise<GuardDecision> {
  const cfg = getConfig();
  if (withinSuppressionWindow(now, cfg.time.flatByUtc, SUPPRESS_MIN_BEFORE)) {
    return { accepted: false, reasons: ['pre-close suppression window'] };
  }
  const res = evaluateTicket(input, {
    minRR: cfg.guardrails.minRR,
    maxRR: cfg.guardrails.maxRR,
    flatByUtc: cfg.time.flatByUtc,
    now,
  });

  let sizing: GuardSizing | undefined;
  if (input.accountId) {
    const account = await Accounts.get(input.accountId);
    if (account) {
      const s = suggestPercent(
        account.planMaxContracts, false,
        cfg.sizing.percent.noBuffer,
        cfg.sizing.percent.withBuffer,
      );
      sizing = {
        allowed: s.contracts,
        halfSizeSuggested: s.halfSizeSuggested,
      };
            if (
        cfg.sizing.enforceSizeHints &&
        typeof input.qty === 'number' &&
        s.contracts !== undefined &&
        input.qty > s.contracts
      ) {
        return {
          accepted: false,
          rr: res.rr,
          reasons: ['qty exceeds allowed'],
          sizing,
        };
      }
      if (cfg.sizing.enforceSizeJumps && sizing.jumpExceeded) {
        return {
          accepted: false,
          rr: res.rr,
          reasons: ['size jump exceeded'],
          sizing,
        };
      }
      // best effort memory update
      Accounts.upsert({ id: input.accountId });
    }
  }

  if (res.decision === 'reject') {
    return { accepted: false, rr: res.rr, reasons: res.reasons, sizing };
  }
  return { accepted: true, rr: res.rr, reasons: [], sizing };
}
