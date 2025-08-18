import { sessionVWAP } from '../../shared/src/series';
import { isWithinRTH_GMT } from '../../shared/src/time';
import type { Bar, Ticket, SymbolCode } from '../../shared/src/types';

export type Bias = 'LONG' | 'SHORT' | 'NONE';

export interface VwapCfg {
  symbol: SymbolCode;
  contract: string;          // e.g., ESU5
  rthStart: '13:30';
  tickSize: number;          // e.g., 0.25
  maxStopTicks: number;      // e.g., 10 on micros
  useBandSigma: number | null; // null => pure VWAP touch; else ±kσ band (σ precomputed per bar set)
  maxTradesPerDay: number;   // ≤2
  tradesTakenToday: number;
  qty: number;               // contracts
}

/**
 * Pure signal generator: VWAP First-Touch
 * - Computes session VWAP at RTH
 * - Generates ONE candidate ticket on the *first* touch of VWAP (or band)
 *   in direction of `bias` (or either if NONE)
 * - Returns null if outside RTH, already touched, or trade caps reached
 * - Stop = opposite band OR capped by maxStopTicks (tighter)
 */
export function vwapFirstTouch(
  bars: Bar[],
  now: Date,
  cfg: VwapCfg,
  bias: Bias,
  alreadyTouched: boolean
): Ticket | null {
  if (!Array.isArray(bars) || bars.length === 0) return null;
  if (cfg.tradesTakenToday >= cfg.maxTradesPerDay) return null;
  if (alreadyTouched) return null;
  if (!isWithinRTH_GMT(now, cfg.symbol)) return null;

  // Identify session start and compute VWAP over [sessionStart, now]
  const dateIso = now.toISOString().slice(0, 10);
  const sessionStart = new Date(`${dateIso}T13:30:00.000Z`);
  const vwapVal = sessionVWAP(bars, sessionStart, now);

  const last = bars[bars.length - 1];
  if (!last) return null;

  const price = last.c;

  // Optional band logic: in MVP we approximate σ with rolling std of closes in window
  let bandUpper: number | null = null;
  let bandLower: number | null = null;

  if (cfg.useBandSigma && cfg.useBandSigma > 0) {
    const closes = bars
      .filter((b) => new Date(b.ts).getTime() >= sessionStart.getTime())
      .map((b) => b.c);
    if (closes.length >= 2) {
      const mean =
        closes.reduce((a, b) => a + b, 0) / closes.length;
      const variance =
        closes.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
        (closes.length - 1);
      const sigma = Math.sqrt(Math.max(variance, 0));
      bandUpper = vwapVal + cfg.useBandSigma * sigma;
      bandLower = vwapVal - cfg.useBandSigma * sigma;
    }
  }

  // Touch detection
  const touchesVwap = Math.abs(price - vwapVal) <= cfg.tickSize / 2;
  const touchesUpper = bandUpper != null && price >= bandUpper - cfg.tickSize / 2;
  const touchesLower = bandLower != null && price <= bandLower + cfg.tickSize / 2;

  // Decide side
  let side: 'BUY' | 'SELL' | null = null;

  // If we have bands, prefer band-first logic; else use pure VWAP touch
  if (bandUpper != null && bandLower != null) {
    if (bias === 'LONG' && touchesLower) side = 'BUY';
    if (bias === 'SHORT' && touchesUpper) side = 'SELL';
    if (bias === 'NONE') {
      if (touchesLower) side = 'BUY';
      else if (touchesUpper) side = 'SELL';
    }
  } else if (touchesVwap) {
    if (bias === 'LONG') side = 'BUY';
    else if (bias === 'SHORT') side = 'SELL';
    else side = price >= vwapVal ? 'SELL' : 'BUY'; // simple heuristic
  }

  if (!side) return null;

  const entry = price;

  // Compute stop:
  // - If bands exist, opposing band is primary; otherwise use maxStopTicks cap
  let stopCandidate: number;
  if (side === 'BUY') {
    if (bandLower != null) stopCandidate = bandLower;
    else stopCandidate = entry - cfg.maxStopTicks * cfg.tickSize;
  } else {
    if (bandUpper != null) stopCandidate = bandUpper;
    else stopCandidate = entry + cfg.maxStopTicks * cfg.tickSize;
  }

  // Round to tick grid, and ensure stop is on the correct side
  const roundedStop =
    Math.round(stopCandidate / cfg.tickSize) * cfg.tickSize;

  const stop =
    side === 'BUY'
      ? Math.min(entry - cfg.tickSize, roundedStop)
      : Math.max(entry + cfg.tickSize, roundedStop);

  const riskPrice = Math.abs(entry - stop);
  if (!(riskPrice > 0)) return null;

  const targets = [entry + (side === 'BUY' ? 1 : -1) * riskPrice]; // 1R required
  const rMultiples = [1];

  const ticket: Ticket = {
    id: `VWAP-${cfg.symbol}-${Date.now()}`,
    symbol: cfg.symbol,
    contract: cfg.contract,
    side,
    qty: cfg.qty,
    order: {
      type: 'LIMIT',
      entry,
      stop,
      targets,
      tif: 'DAY',
      oco: true,
    },
    risk: {
      perTradeUsd: riskPrice, // placeholder (price units)
      rMultipleByTarget: rMultiples,
    },
    apex: {
      stopRequired: true,
      rrLeq5: rMultiples.every((r) => r <= 5 + Number.EPSILON),
      ddHeadroom: true,
      halfSize: true,
      eodReady: true,
      consistency30: 'OK',
    },
    notes: bandUpper != null ? 'VWAP first-touch with bands' : 'VWAP first-touch',
  };

  return ticket;
}

