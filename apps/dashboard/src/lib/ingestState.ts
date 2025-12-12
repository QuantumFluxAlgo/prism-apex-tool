import type { YahooHealthRow } from './api';

export type IngestState = 'LIVE' | 'DEGRADED' | 'NOT LIVE' | 'UNKNOWN';

export const AMBER_THRESHOLD_SECONDS = 120;
export const RED_THRESHOLD_SECONDS = 300;

export const statusChipTone: Record<
  IngestState,
  'emerald' | 'amber' | 'rose' | 'gray'
> = {
  LIVE: 'emerald',
  DEGRADED: 'amber',
  'NOT LIVE': 'rose',
  UNKNOWN: 'gray',
};

export function deriveIngestState(
  rows: YahooHealthRow[] | null | undefined,
): IngestState {
  if (!rows || rows.length === 0) return 'UNKNOWN';
  if (rows.some((row) => row.status === 'RED')) return 'NOT LIVE';
  if (rows.some((row) => row.status === 'AMBER')) return 'DEGRADED';
  if (rows.some((row) => row.status === 'GREEN')) return 'LIVE';
  return 'UNKNOWN';
}

export function summarizeIngestRows(rows: YahooHealthRow[] | null | undefined) {
  const summary = { GREEN: 0, AMBER: 0, RED: 0 };
  if (!rows) return summary;
  for (const row of rows) {
    if (row.status === 'GREEN') summary.GREEN += 1;
    if (row.status === 'AMBER') summary.AMBER += 1;
    if (row.status === 'RED') summary.RED += 1;
  }
  return summary;
}

export function getWorstLagSeconds(
  rows: YahooHealthRow[] | null | undefined,
): number | null {
  if (!rows || rows.length === 0) return null;
  let worst: number | null = null;
  for (const row of rows) {
    if (typeof row.lag_seconds !== 'number') continue;
    if (worst === null || row.lag_seconds > worst) {
      worst = row.lag_seconds;
    }
  }
  return worst;
}

export function formatLag(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '—';
  }
  return `${Math.round(seconds)}s`;
}
