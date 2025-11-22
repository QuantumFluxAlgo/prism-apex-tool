import {
  createSessionMetricsService,
  type SessionMetricsService,
} from './service.js';
import type { SessionMetricsDto } from './runtime.js';

export type SessionMetricsKey = {
  symbol: string;
  sessionDate: string;
};

export type SessionMetricsSummary = {
  status: SessionMetricsDto['status'];
  orWidth: number | null;
  orToAtrRatio: number | null;
  vwapSlopeClassification: SessionMetricsDto['vwapSlopeClassification'];
} | null;

export type SessionMetricsSummaryMap = Map<string, SessionMetricsSummary>;

export interface FetchSessionMetricsBatchOptions {
  maxKeys?: number;
  service?: SessionMetricsService;
}

export const DEFAULT_MAX_SESSION_METRICS_KEYS = 100;

export function sessionMetricsKeyToString(key: SessionMetricsKey): string {
  return `${key.symbol}|${key.sessionDate}`;
}

function toSummary(dto: SessionMetricsDto | null): SessionMetricsSummary {
  if (!dto) return null;
  return {
    status: dto.status,
    orWidth: dto.orWidth ?? null,
    orToAtrRatio: dto.orToAtrRatio ?? null,
    vwapSlopeClassification: dto.vwapSlopeClassification ?? null,
  };
}

export async function fetchSessionMetricsBatch(
  keys: SessionMetricsKey[],
  options: FetchSessionMetricsBatchOptions = {},
): Promise<SessionMetricsSummaryMap> {
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_SESSION_METRICS_KEYS;
  const service = options.service ?? createSessionMetricsService();
  const deduped: SessionMetricsKey[] = [];
  const seen = new Set<string>();

  for (const key of keys) {
    if (!key.symbol || !key.sessionDate) continue;
    const keyStr = sessionMetricsKeyToString(key);
    if (seen.has(keyStr)) continue;
    seen.add(keyStr);
    deduped.push(key);
    if (deduped.length >= maxKeys) break;
  }

  const summaries: SessionMetricsSummaryMap = new Map();
  if (!deduped.length) {
    return summaries;
  }

  for (const key of deduped) {
    const keyStr = sessionMetricsKeyToString(key);
    try {
      const dto = await service.getForSymbolSession({
        symbol: key.symbol,
        sessionDate: key.sessionDate,
      });
      summaries.set(keyStr, toSummary(dto));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('SessionMetrics batch fetch failed', {
        symbol: key.symbol,
        sessionDate: key.sessionDate,
        error,
      });
      summaries.set(keyStr, null);
    }
  }

  return summaries;
}

export function attachSessionMetricsToRows<T extends { sessionMetrics?: SessionMetricsSummary }>(
  rows: T[],
  summaryMap: SessionMetricsSummaryMap,
  getKey: (row: T) => SessionMetricsKey | null,
): T[] {
  if (!rows.length) return rows;

  return rows.map((row) => {
    const key = getKey(row);
    if (!key) return row;
    const summary = summaryMap.get(sessionMetricsKeyToString(key));
    if (summary === undefined) return row;
    return {
      ...row,
      sessionMetrics: summary,
    };
  });
}
