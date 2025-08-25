import { DEFAULTS } from './config.js';
import { guardRR, computeRR } from './guards/rr.js';
import { guardStop } from './guards/stop.js';
import { guardSize, SizeContext } from './guards/size.js';
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

  const stopCheck = guardStop(s, ctx.phase, DEFAULTS.requireStop);
  if (!stopCheck.ok) return { accepted: false, reasons: [stopCheck.reason!] };
  if (s.stop == null) return { accepted: false, reasons: ['stop-required'] };

  const rr = computeRR({ entry: s.entry, stop: s.stop, target: s.target });
  const rrCheck = guardRR(rr, DEFAULTS.MIN_RR, DEFAULTS.MAX_RR);
  if (!rrCheck.ok) return { accepted: false, reasons: [rrCheck.reason!] };

  const sizeRes = guardSize(s, {
    bufferCleared: ctx.bufferCleared,
    accountMax: ctx.account.maxContracts,
    recentSizes: ctx.recentSizes,
  });
  if (!('ok' in sizeRes) || !sizeRes.ok) {
    return { accepted: false, reasons: [sizeRes.reason] };
  }

  const guardrails = ['rr', 'stop', ...sizeRes.guardrails];

  const ticket: Ticket = {
    symbol: ctx.contract,
    side: s.side,
    entry: s.entry,
    stop: s.stop,
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
