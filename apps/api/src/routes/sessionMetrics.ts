import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  createSessionMetricsService,
  type SessionMetricsDto,
  type SessionMetricsService,
} from '../jobs/session-metrics/service.js';

type SessionMetricsQuery = {
  symbol?: string;
  sessionDate?: string;
};

type SessionMetricsRequest = FastifyRequest<{ Querystring: SessionMetricsQuery }>;
type SessionMetricsReply = FastifyReply;

export function makeSessionMetricsHandler(service: SessionMetricsService) {
  return async function handleSessionMetrics(
    req: SessionMetricsRequest,
    res: SessionMetricsReply,
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
        message: 'Failed to compute SessionMetrics for requested symbol/session',
      });
    }
  };
}

export default function sessionMetricsRoute(app: FastifyInstance): void {
  const service: SessionMetricsService = createSessionMetricsService();
  const handler = makeSessionMetricsHandler(service);

  app.get('/session-metrics', handler);
}
