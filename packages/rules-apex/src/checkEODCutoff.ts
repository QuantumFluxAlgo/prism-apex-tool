import { todayCutoff2059GMT } from '../../shared/src/time';

export type EodState = 'OK' | 'BLOCK_NEW';

/**
 * Block new tickets within the last 5 minutes before 20:59 GMT, and after cutoff.
 * Returns 'BLOCK_NEW' if now >= (cutoff - 5 minutes), else 'OK'.
 * Pure function with injected 'now'.
 */
export function checkEODCutoff(now: Date, cutoffGMT: '20:59' = '20:59'): EodState {
  // For MVP we use 20:59 as hard cutoff; if different cutoff is needed later,
  // provide another helper. We reuse shared todayCutoff2059GMT() for determinism.
  const cutoff = todayCutoff2059GMT(now);
  const fiveMinutesMs = 5 * 60 * 1000;
  if (now.getTime() >= cutoff.getTime() - fiveMinutesMs) return 'BLOCK_NEW';
  return 'OK';
}
