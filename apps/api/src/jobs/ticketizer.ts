import { subscribe, publish } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';
import { applyGuardWithSizing } from '@prism-apex-tool/rules-apex';
import { loadRegistry } from '@prism-apex-tool/config';
import { getConfig } from '../config/env.js';
import type { Ticket } from '../schemas/ticket.js';
import { saveTicket, getRecentTicketSizes } from '../store/tickets.js';
import { getAccount as getTelemetryAccount } from '../store/telemetry.js';

function computeRR(params: { entry: number; stop: number; target: number }): number {
  const risk = Math.abs(params.entry - params.stop);
  const reward = Math.abs(params.target - params.entry);
  return reward / risk;
}

function buildConsistencyNotes(phase: 'eval' | 'funded'): string {
  let notes = 'metrics-only; enforce=false';
  if (process.env.CONSISTENCY_ENFORCE === 'true' && phase === 'funded') {
    notes += '; preblock=disabled-pending-telemetry';
  }
  return notes;
}

export type Suggestion = {
  symbol: string; // root symbol
  contract: string; // full contract
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  target: number;
  qty?: number;
  timestampUtc: string;
  meta: { strategy: 'VWAP_FT' | 'OSB' };
};

export const ticketizer = {
  running: false,
  lastSuggestionTs: '',
  lastAcceptedTs: '',
  accepted: { VWAP_FT: 0, OSB: 0 },
  rejected: { VWAP_FT: 0, OSB: 0 },
};

let unsub: (() => void) | null = null;

function isPreClose(ts: string, flat: string): boolean {
  const day = ts.slice(0, 10);
  const s = new Date(ts).getTime();
  const flatTs = new Date(`${day}T${flat}Z`).getTime();
  const diff = flatTs - s;
  return diff <= 5 * 60 * 1000 && diff >= 0;
}

export function guardSuggestion(
  s: Suggestion,
  ctx: {
    accountId: string;
    phase: 'eval' | 'funded';
    maxContracts: number;
    bufferCleared: boolean;
    recentSizes: number[];
    flatByUtc: string;
  },
): Ticket {
  if (isPreClose(s.timestampUtc, ctx.flatByUtc)) {
    return {
      symbol: s.contract,
      side: s.side,
      entry: s.entry,
      stop: s.stop ?? s.entry,
      target: s.target,
      qty: s.qty ?? 0,
      accountId: ctx.accountId,
      timestampUtc: s.timestampUtc,
      meta: {
        strategy: s.meta.strategy,
        rr:
          s.stop != null
            ? computeRR({ entry: s.entry, stop: s.stop, target: s.target })
            : 0,
        guardrails: ['phase:' + ctx.phase, 'preclose-suppressed'],
        consistencyNotes: buildConsistencyNotes(ctx.phase),
      },
      accepted: false,
      reasons: ['preclose-suppression'],
    };
  }

  const res = applyGuardWithSizing(
    {
      symbol: s.symbol,
      side: s.side,
      entry: s.entry,
      stop: s.stop,
      qty: s.qty ?? 0,
      strategy: s.meta.strategy,
      target: s.target,
    },
    {
      phase: ctx.phase,
      account: { id: ctx.accountId, maxContracts: ctx.maxContracts },
      bufferCleared: ctx.bufferCleared,
      recentSizes: ctx.recentSizes,
      contract: s.contract,
    },
  );

  if (res.accepted && res.ticket) {
    return {
      ...res.ticket,
      target: res.ticket.target,
      accepted: true,
      meta: {
        ...res.ticket.meta,
        consistencyNotes: buildConsistencyNotes(ctx.phase),
      },
    } as Ticket;
  }

  return {
    symbol: s.contract,
    side: s.side,
    entry: s.entry,
    stop: s.stop ?? s.entry,
    target: s.target,
    qty: s.qty ?? 0,
    accountId: ctx.accountId,
    timestampUtc: s.timestampUtc,
    meta: {
      strategy: s.meta.strategy,
      rr:
        s.stop != null
          ? computeRR({ entry: s.entry, stop: s.stop, target: s.target })
          : 0,
      guardrails: ['phase:' + ctx.phase, ctx.bufferCleared ? 'buffer' : 'half-size-until-buffer', 'anti-windfall'],
      consistencyNotes: buildConsistencyNotes(ctx.phase),
    },
    accepted: false,
    reasons: res.reasons,
  } as Ticket;
}

function onSuggestion(s: Suggestion): void {
  jobManager.beat('TICKETIZER');
  const registry = loadRegistry();
  const acct = registry.accounts[0];
  const cfg = getConfig();
  ticketizer.lastSuggestionTs = s.timestampUtc;
  const teleAcct = getTelemetryAccount(acct.id);
  const t = guardSuggestion(s, {
    accountId: acct.id,
    phase: acct.phase as 'eval' | 'funded',
    maxContracts: acct.maxContracts,
    bufferCleared: teleAcct?.bufferCleared ?? acct.bufferCleared,
    recentSizes: getRecentTicketSizes(acct.id),
    flatByUtc: cfg.time.flatByUtc,
  });
  if (t.accepted) {
    ticketizer.lastAcceptedTs = t.timestampUtc;
    ticketizer.accepted[t.meta.strategy]++;
  } else {
    ticketizer.rejected[t.meta.strategy]++;
  }
  void saveTicket(t);
  publish('ticket', t);
}

async function start(): Promise<void> {
  ticketizer.running = true;
  unsub = subscribe<Suggestion>('suggestion', onSuggestion);
}

async function stop(): Promise<void> {
  unsub?.();
  ticketizer.running = false;
}

export function registerTicketizerJob(): void {
  jobManager.register('TICKETIZER', start, stop);
}

