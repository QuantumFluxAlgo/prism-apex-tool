import type { Bar, Signal, Fill, BacktestConfig } from './types';
import type { Tick } from './tick/types';
import { clampTargetsByR } from './util';

/** Pluggable interfaces */
export interface BarFillModel {
  run(bars: Bar[], sig: Signal, cfg: BacktestConfig, rngf: () => number): Fill | null;
}
export interface TickFillModel {
  run(ticks: Tick[], sig: Signal, cfg: BacktestConfig, rngf: () => number): Fill | null;
}

/** Default bar fill model (existing behavior) */
export const DefaultBarFill: BarFillModel = {
  run(bars, sig, cfg, rngf) {
    const targets = clampTargetsByR(sig.entry, sig.stop, sig.targets, cfg.maxRiskReward, sig.side);
    const risk = Math.abs(sig.entry - sig.stop);
    const slip = (cfg.slippageTicks ?? 0);
    let entered = false;
    let entryPx = sig.entry;
    let entryTs = '';
    const stopPx = sig.stop;
    const tgtPx = targets[0];

    for (const b of bars) {
      const { high, low } = b;

      if (!entered) {
        if (sig.side === 'BUY' && high >= sig.entry) {
          entryPx = sig.entry + slip * (rngf() > 0.5 ? 1 : -1);
          entryTs = b.ts; entered = true;
        } else if (sig.side === 'SELL' && low <= sig.entry) {
          entryPx = sig.entry - slip * (rngf() > 0.5 ? 1 : -1);
          entryTs = b.ts; entered = true;
        }
        continue;
      }

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
    return null;
  }
};

/** Simple tick fill model (cross-through fills) */
export const SimpleTickFill: TickFillModel = {
  run(ticks, sig, cfg, rngf) {
    const targets = clampTargetsByR(sig.entry, sig.stop, sig.targets, cfg.maxRiskReward, sig.side);
    const risk = Math.abs(sig.entry - sig.stop);
    const slip = (cfg.slippageTicks ?? 0);

    let entered = false;
    let entryPx = sig.entry;
    let entryTs = '';
    const stopPx = sig.stop;
    const tgtPx = targets[0];

    for (const t of ticks) {
      const p = t.price;

      if (!entered) {
        if (sig.side === 'BUY' && p >= sig.entry) {
          entryPx = sig.entry + slip * (rngf() > 0.5 ? 1 : -1);
          entryTs = t.ts; entered = true; continue;
        }
        if (sig.side === 'SELL' && p <= sig.entry) {
          entryPx = sig.entry - slip * (rngf() > 0.5 ? 1 : -1);
          entryTs = t.ts; entered = true; continue;
        }
      } else {
        if (sig.side === 'BUY') {
          if (p <= stopPx) {
            const exitPx = stopPx - slip;
            const pnl = (exitPx - entryPx) * sig.size * cfg.tickValue;
            return { entryTs, exitTs: t.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'STOP', rMultiple: (exitPx - entryPx) / risk };
          }
          if (p >= tgtPx) {
            const exitPx = tgtPx - slip;
            const pnl = (exitPx - entryPx) * sig.size * cfg.tickValue;
            return { entryTs, exitTs: t.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'TARGET', rMultiple: (exitPx - entryPx) / risk };
          }
        } else {
          if (p >= stopPx) {
            const exitPx = stopPx + slip;
            const pnl = (entryPx - exitPx) * sig.size * cfg.tickValue;
            return { entryTs, exitTs: t.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'STOP', rMultiple: (entryPx - exitPx) / risk };
          }
          if (p <= tgtPx) {
            const exitPx = tgtPx + slip;
            const pnl = (entryPx - exitPx) * sig.size * cfg.tickValue;
            return { entryTs, exitTs: t.ts, entryPx, exitPx, size: sig.size, pnl, reason: 'TARGET', rMultiple: (entryPx - exitPx) / risk };
          }
        }
      }
    }
    return null;
  }
};
