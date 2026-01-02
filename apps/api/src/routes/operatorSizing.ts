import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { computeNextTradeSizingForDate } from '../services/operatorRisk.js';
import type { NextTradeSizingDto } from './dto/operatorSizing.js';

const querySchema = z.object({
  dateUtc: z.string().optional(),
  perContractRisk: z.string().min(1),
  minContracts: z.string().optional(),
  maxContractsCap: z.string().optional(),
  riskFractionPerTrade: z.string().optional(),
});

type OperatorSizingQuery = z.infer<typeof querySchema>;

export async function registerOperatorSizingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/operator-risk/sizing',
    async (
      request: FastifyRequest<{ Querystring: OperatorSizingQuery }>,
      reply: FastifyReply,
    ): Promise<void> => {
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
        return;
      }

      const { dateUtc, perContractRisk, minContracts, maxContractsCap, riskFractionPerTrade } = parsed.data;
      const perRisk = Number(perContractRisk);
      if (!Number.isFinite(perRisk) || perRisk <= 0) {
        reply.code(400).send({ error: 'perContractRisk must be a positive number' });
        return;
      }

      const todayUtc = new Date().toISOString().slice(0, 10);
      const effectiveDate = (dateUtc && dateUtc.trim()) || todayUtc;

      const minC = minContracts ? Number(minContracts) : 1;
      const maxCap = maxContractsCap ? Number(maxContractsCap) : 10;
      const frac = riskFractionPerTrade ? Number(riskFractionPerTrade) : 0.25;

      if (!Number.isFinite(minC) || minC < 0) {
        reply.code(400).send({ error: 'minContracts must be a non-negative number' });
        return;
      }
      if (!Number.isFinite(maxCap) || maxCap <= 0) {
        reply.code(400).send({ error: 'maxContractsCap must be a positive number' });
        return;
      }
      if (!Number.isFinite(frac) || frac <= 0 || frac > 1) {
        reply.code(400).send({ error: 'riskFractionPerTrade must be between 0 and 1' });
        return;
      }

      const result = await computeNextTradeSizingForDate({
        dateUtc: effectiveDate,
        perContractRisk: perRisk,
        minContracts: minC,
        maxContractsCap: maxCap,
        riskFractionPerTrade: frac,
      });

      const dto: NextTradeSizingDto = {
        dateUtc: effectiveDate,
        perContractRisk: perRisk,
        minContracts: minC,
        maxContractsCap: maxCap,
        riskFractionPerTrade: frac,
        snapshot: {
          dailyStartingBalance: result.snapshot.dailyStartingBalance,
          maxDailyDrawdownPct: result.snapshot.maxDailyDrawdownPct,
          maxDailyLossAmount: result.snapshot.maxDailyLossAmount,
          realisedPnL: result.snapshot.realisedPnL,
          openRisk: result.snapshot.openRisk,
          drawdownAmount: result.snapshot.drawdownAmount,
          remainingRiskCapacity: result.snapshot.remainingRiskCapacity,
          isLockedOut: result.snapshot.isLockedOut,
        },
        sizing: result.sizing,
      };

      reply.send(dto);
    },
  );
}
