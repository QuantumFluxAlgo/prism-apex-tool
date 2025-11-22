import { describe, expect, it } from 'vitest';
import {
  attachSessionMetricsToRows,
  fetchSessionMetricsBatch,
  sessionMetricsKeyToString,
  type SessionMetricsKey,
} from './batch.js';
import type { SessionMetricsService } from './service.js';
import type { SessionMetricsDto } from './runtime.js';

describe('session-metrics batch helper', () => {
  it('dedupes keys and respects maxKeys', async () => {
    const keys: SessionMetricsKey[] = [
      { symbol: 'ES', sessionDate: '2025-01-01' },
      { symbol: 'ES', sessionDate: '2025-01-01' },
      { symbol: 'NQ', sessionDate: '2025-01-02' },
    ];

    const resolved: Record<string, number> = {};
    const fakeService: SessionMetricsService = {
      async getForSymbolSession({ symbol, sessionDate }) {
        const idx = `${symbol}-${sessionDate}`;
        resolved[idx] = (resolved[idx] ?? 0) + 1;
        return {
          status: 'OK',
          orWidth: 10,
          orToAtrRatio: 1.5,
          vwapSlopeClassification: 'UP',
        } as SessionMetricsDto;
      },
    };

    const map = await fetchSessionMetricsBatch(keys, {
      maxKeys: 2,
      service: fakeService,
    });

    expect(map.size).toBeLessThanOrEqual(2);
    expect(Object.keys(resolved)).toHaveLength(2);
  });

  it('attaches summaries to rows based on key function', () => {
    const rows = [
      { symbol: 'ES', session_date_utc: '2025-01-01', sessionMetrics: null },
      { symbol: 'NQ', session_date_utc: '2025-01-02', sessionMetrics: null },
    ];

    const map = new Map<string, any>();
    map.set(sessionMetricsKeyToString({ symbol: 'ES', sessionDate: '2025-01-01' }), {
      status: 'OK',
      orWidth: 10,
      orToAtrRatio: 1.2,
      vwapSlopeClassification: 'UP',
    });

    const result = attachSessionMetricsToRows(rows, map, (row) => {
      const sessionDate = typeof row.session_date_utc === 'string' ? row.session_date_utc : null;
      if (!row.symbol || !sessionDate) return null;
      return { symbol: row.symbol, sessionDate: sessionDate.slice(0, 10) };
    });

    expect(result[0].sessionMetrics).toMatchObject({ status: 'OK' });
    expect(result[1].sessionMetrics).toBeUndefined();
  });
});
