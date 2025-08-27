import { ApexRulesCfg, loadApexRules } from './config.js';

export type OrderParams = {
  qty: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type GuardContext = {
  mode: 'funded' | 'evaluation';
  bufferCleared: boolean;
  maxContractsAllowed: number;
  now?: Date;
  cfg?: ApexRulesCfg;
};

export type GuardResult = {
  allow: boolean;
  reason?: string;
  ticket?: OrderParams;
};

function isEODWindow(now: Date, cutoff: string): boolean {
  const [h, m, s] = cutoff.split(':').map(Number);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);
  const second = Number(parts.find((p) => p.type === 'second')?.value);
  const current = hour * 3600 + minute * 60 + second;
  const cutoffSec = h * 3600 + m * 60 + s;
  return current >= cutoffSec;
}

export function guardApexFundingRules(t: OrderParams, ctx: GuardContext): GuardResult {
  if (ctx.mode !== 'funded') return { allow: true, ticket: t };

  const cfg = ctx.cfg ?? loadApexRules();

  if (t.stopLoss == null) return { allow: false, reason: 'STOP_REQUIRED' };
  if (t.takeProfit == null) return { allow: false, reason: 'RR_REQUIRED' };

  const rr = Math.abs(t.takeProfit - t.entryPrice) / Math.abs(t.entryPrice - t.stopLoss);
  if (!Number.isFinite(rr) || rr <= 0) return { allow: false, reason: 'RR_REQUIRED' };
  if (rr < cfg.minRR) return { allow: false, reason: 'RR_LT_MIN' };
  if (rr > cfg.maxRR) return { allow: false, reason: 'RR_GT_MAX' };

  let qty = t.qty;
  if (cfg.halfSizeUntilBufferCleared && !ctx.bufferCleared) {
    qty = Math.min(qty, Math.floor(ctx.maxContractsAllowed / 2));
    if (qty <= 0) return { allow: false, reason: 'SIZE_ZERO_AFTER_HALFSIZE' };
  }
  qty = Math.min(qty, ctx.maxContractsAllowed);

  if (isEODWindow(ctx.now ?? new Date(), cfg.eodFlatCutoffET)) {
    return { allow: false, reason: 'EOD_FLAT_WINDOW' };
  }

  return { allow: true, ticket: { ...t, qty } };
}
