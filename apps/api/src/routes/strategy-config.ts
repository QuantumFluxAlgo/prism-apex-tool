import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import {
  getStrategyUpdateSchema,
  strategyParamSchema,
  type StrategyParams,
  type StrategyKey,
  type StrategyConfigUpdateInput,
} from '../dto/strategy-config/index.js';
import {
  getStrategyConfigWithWarnings,
  parseStrategyKey,
  updateStrategyConfig,
  StrategyValidationError,
  getStrategyConfigHistory,
} from '../services/strategy-config/index.js';

const paramsValidator = strategyParamSchema;

function sendValidationError(reply: FastifyReply, message: string) {
  reply.code(400);
  return reply.send({ error: message });
}

export default async function strategyConfigRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  app.get('/api/strategy-config/:strategy', async (req: FastifyRequest<{ Params: StrategyParams }>, reply) => {
    const parsed = paramsValidator.safeParse(req.params);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid strategy key');
    }

    const strategy = parsed.data.strategy as StrategyKey;
    const normalizedStrategy = parseStrategyKey(strategy);
    try {
      const { config, warnings } = await getStrategyConfigWithWarnings(normalizedStrategy);
      return reply.send({ strategy: normalizedStrategy, config, warnings });
    } catch (error) {
      req.log.error({ error, strategy }, 'strategy config fetch failed');
      return reply.status(500).send({ error: 'Failed to load strategy config' });
    }
  });

  app.get('/api/strategy-config/:strategy/history', async (req: FastifyRequest<{ Params: StrategyParams }>, reply) => {
    const parsed = paramsValidator.safeParse(req.params);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid strategy key');
    }

    const strategy = parsed.data.strategy as StrategyKey;
    const normalizedStrategy = parseStrategyKey(strategy);

    try {
      const history = await getStrategyConfigHistory(normalizedStrategy);
      return reply.send({ strategy: normalizedStrategy, history });
    } catch (error) {
      req.log.error({ error, strategy }, 'strategy config history fetch failed');
      return reply.status(500).send({ error: 'Failed to load strategy config history' });
    }
  });

  app.put(
    '/api/strategy-config/:strategy',
    async (
      req: FastifyRequest<{ Params: StrategyParams; Body: unknown }>,
      reply,
    ) => {
      const parsedParams = paramsValidator.safeParse(req.params);
      if (!parsedParams.success) {
        return sendValidationError(reply, 'Invalid strategy key');
      }

      const strategy = parsedParams.data.strategy as StrategyKey;
      const normalizedStrategy = parseStrategyKey(strategy);
      const payloadSchema = getStrategyUpdateSchema(normalizedStrategy);
      const parsedBody = payloadSchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return sendValidationError(reply, 'Invalid payload');
      }

      try {
        const payload = {
          strategy: normalizedStrategy,
          ...parsedBody.data,
        } as StrategyConfigUpdateInput;

        const result = await updateStrategyConfig(normalizedStrategy, payload);
        return reply.send({
          strategy: normalizedStrategy,
          config: result.config,
          warnings: result.warnings,
        });
      } catch (error) {
        if (error instanceof StrategyValidationError) {
          return reply.status(400).send({
            strategy: error.strategy,
            errors: error.errors,
            warnings: error.warnings,
          });
        }
        req.log.error({ error, strategy }, 'strategy config update failed');
        return reply.status(500).send({ error: 'Failed to update strategy config' });
      }
    },
  );
}
