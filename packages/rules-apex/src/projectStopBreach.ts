import type { Ticket, AccountState } from '../../shared/src/types';

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

/**
 * Guardrail: Block any ticket whose *projected stop-out* would take equity below the DD line.
 *
 * Projection model (MVP, market-agnostic):
 * - Use ticket.risk.perTradeUsd as the total max loss if the stop is hit (already qty-aware).
 * - Projected net liq at stop = state.netLiq - perTradeUsd.
 * - If projected < ddLine => FAIL (block).
 *
 * Conservative default:
 * - If perTradeUsd is missing/invalid, FAIL with reason to avoid underestimating risk.
 */
export function projectStopBreach(
  ticket: Ticket,
  state: AccountState,
  ddLine: number
): RuleResult {
  const netLiq = state?.netLiq;

  if (!Number.isFinite(netLiq) || netLiq <= 0) {
    return { ok: false, reason: 'Invalid account state (netLiq)' };
  }
  if (!Number.isFinite(ddLine) || ddLine < 0) {
    return { ok: false, reason: 'Invalid drawdown line' };
  }

  const perTradeUsd = ticket?.risk?.perTradeUsd;
  if (!Number.isFinite(perTradeUsd) || perTradeUsd! <= 0) {
    return {
      ok: false,
      reason: 'Unknown or invalid per-trade risk; cannot verify DD headroom',
    };
  }

  const projectedAtStop = netLiq - perTradeUsd!;
  if (projectedAtStop < ddLine - Number.EPSILON) {
    return {
      ok: false,
      reason: `Projected stop-out (${projectedAtStop.toFixed(
        2
      )}) breaches DD line (${ddLine.toFixed(2)})`,
    };
  }

  return { ok: true };
}
