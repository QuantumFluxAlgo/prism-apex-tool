import type { Bar, Signal, Fill, BacktestConfig } from './types';
import { clampTargetsByR } from './util';

/**
 * Very simple bar-by-bar fill model:
 * - Entry triggered if bar trades through entry price.
 * - Stop/Target hits if next bars cross those levels.
 * - Optional slippage: +/- N ticks on fills (deterministic via RNG supplied externally, applied as constant for MVP).
 */
export function simulateTrade(bars: Bar[], sig: Signal, cfg: BacktestConfig, rngf: () => number): Fill | null {
  const targets = clampTargetsByR(sig.entry, sig.stop, sig.targets, cfg.maxRiskReward, sig.side);
  const risk = Math.abs(sig.entry - sig.stop);
  const slip = cfg.slippageTicks ?? 0;

  let entered = false;
  let entryPx = sig.entry;
  let entryTs = '';
  const stopPx = sig.stop;
  const tgtPx = targets[0]; // MVP single target

  for (const b of bars) {
    const high = b.high;
    const low = b.low;

    if (!entered) {
      if (sig.side === 'BUY' && high >= sig.entry) {
        entryPx = sig.entry + slip * (rngf() > 0.5 ? 1 : -1);
        entryTs = b.ts;
        entered = true;
      } else if (sig.side === 'SELL' && low <= sig.entry) {
        entryPx = sig.entry - slip * (rngf() > 0.5 ? 1 : -1);
        entryTs = b.ts;
        entered = true;
      }
      continue;
    }

    // After entry: check stop/target
    if (sig.side === 'BUY') {
      if (low <= stopPx) {
        const exitPx = stopPx - slip;
        const pnl = (exitPx - entryPx) * sig.size * cfg.tickValue;
        return { entryTs, exitTs: b.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'STOP', rMultiple: (exitPx - entryPx) / risk };
      }
      if (high >= tgtPx) {
        const exitPx = tgtPx - slip;
        const pnl = (exitPx - entryPx) * sig.size * cfg.tickValue;
        return { entryTs, exitTs: b.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'TARGET', rMultiple: (exitPx - entryPx) / risk };
      }
    } else {
      if (high >= stopPx) {
        const exitPx = stopPx + slip;
        const pnl = (entryPx - exitPx) * sig.size * cfg.tickValue;
        return { entryTs, exitTs: b.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'STOP', rMultiple: (entryPx - exitPx) / risk };
      }
      if (low <= tgtPx) {
        const exitPx = tgtPx + slip;
        const pnl = (entryPx - exitPx) * sig.size * cfg.tickValue;
        return { entryTs, exitTs: b.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'TARGET', rMultiple: (entryPx - exitPx) / risk };
      }
    }
  }
  return null; // not filled
}
