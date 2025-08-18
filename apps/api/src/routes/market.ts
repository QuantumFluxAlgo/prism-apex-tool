import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TradovateClient } from '../../../../packages/clients-tradovate/src/rest.ts';
import { TradovateClientError } from '../../../../packages/clients-tradovate/src/types.ts';

export async function marketRoutes(app: FastifyInstance) {
  const client = new TradovateClient();

  app.get('/account', async (req, reply) => {
    try {
      const data = await client.getAccount();
      return data;
    } catch (e) {
      app.log.error(e);
      if (e instanceof TradovateClientError) return reply.code(502).send({ error: e.message });
      return reply.code(500).send({ error: 'Account fetch failed' });
    }
  });

  app.get('/positions', async (req, reply) => {
    try { return await client.getPositions(); }
    catch (e) {
      app.log.error(e);
      return reply.code(502).send({ error: 'Positions fetch failed' });
    }
  });

  app.get('/orders', async (req, reply) => {
    try { return await client.getOrders(); }
    catch (e) {
      app.log.error(e);
      return reply.code(502).send({ error: 'Orders fetch failed' });
    }
  });

  app.get('/bars', async (req, reply) => {
    const q = z.object({
      symbol: z.enum(['ES','NQ','MES','MNQ']),
      tf: z.enum(['1m','5m']),
      limit: z.string().optional()
    }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    try {
      const limit = q.data.limit ? Number(q.data.limit) : 500;
      return await client.getBars(q.data.symbol, q.data.tf, limit);
    } catch (e) {
      app.log.error(e);
      return reply.code(502).send({ error: 'Bars fetch failed' });
    }
  });

  app.get('/last', async (req, reply) => {
    const q = z.object({ symbol: z.enum(['ES','NQ','MES','MNQ']) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid symbol' });
    try { return await client.getLast(q.data.symbol); }
    catch (e) { app.log.error(e); return reply.code(502).send({ error: 'Last fetch failed' }); }
  });
}
