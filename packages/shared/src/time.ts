import type { SymbolCode } from './types.js';

/** Ensure a Date instance in GMT (UTC). */
export function toGMT(input: Date | string): Date {
  const date = typeof input === 'string' ? new Date(input) : new Date(input.getTime());
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }
  return date;
}

/**
 * Returns true if date is within RTH (Regular Trading Hours) for the symbol.
 * Default RTH for ES/NQ: 13:30–20:59 GMT (configurable via ENV later).
 */
export function isWithinRTH_GMT(date: Date, symbol: SymbolCode): boolean {
  // symbol currently unused but kept for future configurability
  void symbol;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const start = 13 * 60 + 30; // 13:30
  const end = 20 * 60 + 59; // 20:59
  return minutes >= start && minutes <= end;
}

/**
 * Utility: returns Date at today’s 20:59 GMT (EOD cutoff), used by EOD logic.
 */
export function todayCutoff2059GMT(now: Date): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      20,
      59,
      0,
      0,
    ),
  );
}
