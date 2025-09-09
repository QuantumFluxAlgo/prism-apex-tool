import { getPhasePolicy } from './config.js';
import { guardRR, computeRR } from './guards/rr.js';
import { guardStop } from './guards/stop.js';
import { guardSize } from './guards/size.js';
import { Suggestion, Ticket, AccountPhase } from './types.js';

export type GuardContext = {
  phase: AccountPhase;
  account: { id: string; maxContracts: number };
  bufferCleared: boolean;
  recentSizes: number[];
  contract: string;
  now?: Date;
};

export function applyGuardWithSizing(
  s: Suggestion,
  ctx: GuardContext,
): { accepted: boolean; ticket?: Ticket; reasons?: string[] } {
  if (s.target == null) return { accepted: false, reasons: ['missing-target'] };

  const policy = getPhasePolicy(ctx.phase);

  const guardrails = [`phase:${ctx.phase}`];
  guardrails.push(policy.requireStop ? 'stop-required' : 'stop-optional');
  guardrails.push('rr-clamp');
  if (policy.halfSizeUntilBuffer) guardrails.push('half-size-until-buffer');
  if (policy.antiWindfall) guardrails.push('anti-windfall');

  const stopCheck = guardStop(s, ctx.phase, policy.requireStop);
  if (!stopCheck.ok) return { accepted: false, reasons: [stopCheck.reason!] };

  let rr = 0;
  if (s.stop == null) {
    if (policy.requireStop) return { accepted: false, reasons: ['stop-required'] };
  } else {
    rr = computeRR({ entry: s.entry, stop: s.stop, target: s.target });
    const rrCheck = guardRR(rr, policy.minRR, policy.maxRR);
    if (!rrCheck.ok) return { accepted: false, reasons: [rrCheck.reason!] };
  }

  const sizeRes = guardSize(
    s,
    {
      bufferCleared: ctx.bufferCleared,
      accountMax: ctx.account.maxContracts,
      recentSizes: ctx.recentSizes,
    },
    { halfSizeUntilBuffer: policy.halfSizeUntilBuffer, antiWindfall: policy.antiWindfall },
  );
  if (!('ok' in sizeRes) || !sizeRes.ok) {
    return { accepted: false, reasons: [sizeRes.reason] };
  }
  guardrails.push(...sizeRes.guardrails);

  const ticket: Ticket = {
    symbol: ctx.contract,
    side: s.side,
    entry: s.entry,
    stop: s.stop ?? s.entry,
    qty: sizeRes.qty,
    accountId: ctx.account.id,
    timestampUtc: (ctx.now ?? new Date()).toISOString(),
    meta: {
      strategy: s.strategy,
      rr,
      guardrails,
      ...(sizeRes.sizingHint ? { sizingHint: sizeRes.sizingHint } : {}),
      ...(sizeRes.consistencyNotes ? { consistencyNotes: sizeRes.consistencyNotes } : {}),
    },
    target: s.target,
  };

  return { accepted: true, ticket };
}
