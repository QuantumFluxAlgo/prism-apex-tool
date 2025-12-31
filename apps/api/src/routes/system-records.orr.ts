import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  listLatestOrrGateResults,
  listOrrGateResults,
} from '../store/orrGateResults.js';

type ListQuery = {
  symbol?: string;
  sessionDate?: string;
  sinceUtc?: string;
  untilUtc?: string;
  limit?: string;
  offset?: string;
};

type LatestQuery = {
  sessionDate: string;
  symbols: string;
};

function toInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export default async function systemRecordsOrrRoutes(app: FastifyInstance) {
  // Engineering-only surface; future-proofed for operator use. Read-only.
  app.get(
    '/api/system-records/orr-gate',
    async (req: FastifyRequest<{ Querystring: ListQuery }>) => {
      const q = req.query ?? {};
      const limit = toInt(q.limit, 100);
      const offset = toInt(q.offset, 0);

      const rows = await listOrrGateResults({
        symbol: q.symbol,
        sessionDate: q.sessionDate,
        sinceUtc: q.sinceUtc,
        untilUtc: q.untilUtc,
        limit,
        offset,
      });

      return {
        items: rows,
        nextOffset:
          rows.length === Math.max(1, Math.min(500, limit)) ? offset + rows.length : null,
      };
    },
  );

  app.get(
    '/api/system-records/orr-gate/latest',
    async (req: FastifyRequest<{ Querystring: LatestQuery }>) => {
      const q = req.query;
      const symbols = (q.symbols ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const rows = await listLatestOrrGateResults({
        sessionDate: q.sessionDate,
        symbols,
      });

      return { items: rows };
    },
  );
}
