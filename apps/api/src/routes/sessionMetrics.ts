/**
 * SessionMetrics API route (Phase 1 Step 1.8a, Option A).
 */

import type { FastifyInstance } from 'fastify';
import {
  createSessionMetricsService,
  type SessionMetricsDto,
  type SessionMetricsService,
} from '../jobs/session-metrics/service.js';

export interface SessionMetricsHandlerRequest {
  query: {
    symbol?: string;
    sessionDate?: string;
  };
}

export interface SessionMetricsHandlerReply {
  status: (code: number) => SessionMetricsHandlerReply;
  send: (body: unknown) => void;
}

export function makeSessionMetricsHandler(
  service: SessionMetricsService,
) {
  return async function handleSessionMetrics(
    req: SessionMetricsHandlerRequest,
    res: SessionMetricsHandlerReply,
  ): Promise<void> {
    const { symbol, sessionDate } = req.query;

    if (!symbol || !sessionDate) {
      res.status(400).send({
        error: 'BAD_REQUEST',
        message: 'symbol and sessionDate query parameters are required',
      });
      return;
    }

    try {
      const result: SessionMetricsDto = await service.getForSymbolSession({
        symbol,
        sessionDate,
      });

      res.status(200).send(result);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SessionMetrics handler error', err);

      res.status(500).send({
        error: 'INTERNAL_ERROR',
        message:
          'Failed to compute SessionMetrics for requested symbol/session',
      });
    }
  };
}

export default function sessionMetricsRoute(app: FastifyInstance): void {
  const service: SessionMetricsService = createSessionMetricsService();
  const handler = makeSessionMetricsHandler(service);

  app.get('/session-metrics', (req, res) =>
    handler(
      {
        query: (req as any).query as {
          symbol?: string;
          sessionDate?: string;
        },
      },
      {
        status(code: number) {
          (res as any).status(code);
          return this;
        },
        send(body: unknown) {
          (res as any).send(body);
        },
      },
    ),
  );
}
