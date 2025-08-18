import { openingRange } from '../../shared/src/series';
import { isWithinRTH_GMT } from '../../shared/src/time';
import type { Bar, Ticket, SymbolCode } from '../../shared/src/types';

export interface OpenSessionCfg {
  symbol: SymbolCode;
  contract: string;          // e.g., ESU5
  rthStart: '13:30';         // fixed for MVP (can be config later)
  orMinutes: number;         // e.g., 30
  tickSize: number;          // e.g., 0.25 for ES
  tickBuffer: number;        // e.g., 1 * tickSize
  maxTradesPerDay: number;   // 1 or 2
  tradesTakenToday: number;  // passed in by caller
  targetMultiples: number[]; // must include 1 (1R) and optionally 2
  qty: number;               // contracts
  sidePreference?: 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH';
}

/**
 * Pure signal generator: Opening Range Breakout
 * - Computes ORH/ORL over first N minutes from RTH open
 * - Generates at most one candidate ticket (long OR short) based on breakout
 * - Returns null if outside RTH, before OR complete, or trade caps reached
 */
export function openSessionBreakout(
  bars: Bar[],
  now: Date,
  cfg: OpenSessionCfg
): Ticket | null {
  // Basic validations
  if (!Array.isArray(bars) || bars.length === 0) return null;
  if (cfg.tradesTakenToday >= cfg.maxTradesPerDay) return null;

  // Ensure we're within RTH for this symbol
  if (!isWithinRTH_GMT(now, cfg.symbol)) return null;

  // Determine OR window [start, end]
  const dateIso = now.toISOString().slice(0, 10); // YYYY-MM-DD from UTC
  const orStart = new Date(`${dateIso}T13:30:00.000Z`);
  const orEnd = new Date(orStart.getTime() + cfg.orMinutes * 60_000);

  // If OR window not finished, no signal yet
  if (now.getTime() < orEnd.getTime()) return null;

  // Compute OR high/low from bars within window
  const { high: ORH, low: ORL } = openingRange(bars, orStart, orEnd);

  const last = bars[bars.length - 1];
  if (!last) return null;

  // Determine breakout direction by last close crossing boundary
  const brokeUp = last.c > ORH;
  const brokeDown = last.c < ORL;

  // Respect side preference if any
  if (cfg.sidePreference === 'LONG_ONLY' && !brokeUp) return null;
  if (cfg.sidePreference === 'SHORT_ONLY' && !brokeDown) return null;
  if (!brokeUp && !brokeDown) return null;

  const side = brokeUp ? 'BUY' : 'SELL';
  const entry = last.c; // simple entry at close; API can adjust to limit/stop
  const stopRaw =
    side === 'BUY' ? ORL - cfg.tickBuffer : ORH + cfg.tickBuffer;

  // Round stop to tick grid
  const stop = Math.round(stopRaw / cfg.tickSize) * cfg.tickSize;

  // Risk (price units)
  const riskPrice = Math.abs(entry - stop);
  if (!(riskPrice > 0)) return null; // invalid geometry

  // Targets from R multiples
  const targets = cfg.targetMultiples
    .filter((m) => m > 0)
    .map((m) => (side === 'BUY' ? entry + m * riskPrice : entry - m * riskPrice));

  if (targets.length === 0) return null;

  const rMultiples = targets.map((t) =>
    side === 'BUY' ? (t - entry) / riskPrice : (entry - t) / riskPrice
  );

  // Build candidate ticket (Apex flags set to safe defaults; rules filled later)
  const ticket: Ticket = {
    id: `ORB-${cfg.symbol}-${Date.now()}`,
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
      perTradeUsd: riskPrice, // placeholder (price units). API may convert to USD.
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
    notes: 'Open Session Breakout (pure signal)',
  };

  return ticket;
}

