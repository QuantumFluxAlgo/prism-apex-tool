import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getShadowOutcomesBySessionAndStrategy,
  getShadowOutcomesByTicketId,
} from '../store/shadowOutcomes.js';

type TicketParams = {
  ticketId: string;
};

type AggregateQuery = {
  sessionDate?: string;
  strategy?: string;
  limit?: string;
};

function toLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(5000, Math.trunc(parsed)));
}

export default async function shadowOutcomesRoutes(app: FastifyInstance) {
  app.get(
    '/shadow-outcomes/:ticketId',
    async (req: FastifyRequest<{ Params: TicketParams }>) => {
      const rows = await getShadowOutcomesByTicketId(req.params.ticketId);
      return { ticketId: req.params.ticketId, rows };
    },
  );

  app.get(
    '/shadow-outcomes',
    async (req: FastifyRequest<{ Querystring: AggregateQuery }>) => {
      const sessionDate = (req.query.sessionDate ?? '').trim();
      const strategy = (req.query.strategy ?? '').trim();
      if (!sessionDate || !strategy) {
        return {
          error: 'missing_query_params',
          required: ['sessionDate', 'strategy'],
        };
      }

      const limit = toLimit(req.query.limit, 500);
      const rows = await getShadowOutcomesBySessionAndStrategy(
        sessionDate,
        strategy,
        limit,
      );

      return { sessionDate, strategy, rows };
    },
  );
}
