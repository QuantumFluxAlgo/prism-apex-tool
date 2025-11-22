/**
 * SessionMetrics service layer (Phase 1 Step 1.8a, Option A).
 */

import {
  computeSessionMetricsForSymbolSession,
  type SessionMetricsDto,
} from './runtime.js';

export type { SessionMetricsDto } from './runtime.js';

export interface SessionMetricsService {
  getForSymbolSession(input: {
    symbol: string;
    sessionDate: string;
  }): Promise<SessionMetricsDto>;
}

export interface SessionMetricsServiceDeps {
  computeSessionMetricsForSymbolSession(input: {
    symbol: string;
    sessionDate: string;
  }): Promise<SessionMetricsDto>;
}

export function createSessionMetricsService(
  deps?: Partial<SessionMetricsServiceDeps>,
): SessionMetricsService {
  const impl: SessionMetricsServiceDeps = {
    computeSessionMetricsForSymbolSession,
    ...(deps ?? {}),
  };

  return {
    async getForSymbolSession({ symbol, sessionDate }) {
      return impl.computeSessionMetricsForSymbolSession({ symbol, sessionDate });
    },
  };
}
