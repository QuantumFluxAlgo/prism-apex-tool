import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  canonicalizePlannerKey,
  plannerKeys,
  rejectStages,
  type PlannerKey,
  type RejectStage,
  mapRawReasonToPlannerRejectCode,
  plannerRejectReasonCodes,
  type PlannerRejectReasonCode,
} from '../system-records/plannerRejectVocab.js';

import { listPlannerRejectCounts } from '../store/plannerRejectCounts.js';

const MAX_LIMIT = 500;

function clampLimit(n: unknown): number {
  const v = Number(n ?? 100);
  if (!Number.isFinite(v)) return 100;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(v)));
}

function clampOffset(n: unknown): number {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

function parsePlannerKeyOrUndefined(raw: unknown): PlannerKey | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  const k = canonicalizePlannerKey(s);
  if (!k) return undefined;
  return k;
}

function parseRejectStageOrDefault(raw: unknown): RejectStage {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s) return 'PLANNER';
  if ((rejectStages as readonly string[]).includes(s)) return s as RejectStage;
  return 'PLANNER';
}

function parseReasonCodeOrUndefined(raw: unknown): PlannerRejectReasonCode | undefined {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s) return undefined;
  if ((plannerRejectReasonCodes as readonly string[]).includes(s)) return s as PlannerRejectReasonCode;
  return undefined;
}

const plugin: FastifyPluginAsync = async (app) => {
  const QuerySchema = z.object({
    sessionDate: z.string().min(10).max(10),
    symbol: z.string().optional(),
    strategy: z.string().optional(),
    rejectStage: z.string().optional(),
    reasonCode: z.string().optional(),
    limit: z.any().optional(),
    offset: z.any().optional(),
  });

  app.get('/planner-rejects', async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { sessionDate, symbol, strategy, rejectStage, reasonCode, limit, offset } = parsed.data;

    const requestedPlanner = parsePlannerKeyOrUndefined(strategy);
    const stage = parseRejectStageOrDefault(rejectStage);
    const rc = parseReasonCodeOrUndefined(reasonCode);

    const out = await listPlannerRejectCounts({
      sessionDate,
      symbol: symbol ? String(symbol) : undefined,
      requestedPlanner,
      rejectingPlanner: undefined,
      rejectStage: stage,
      reasonCode: rc,
      limit: clampLimit(limit),
      offset: clampOffset(offset),
    });

    return reply.send(out);
  });
};

export default plugin;
