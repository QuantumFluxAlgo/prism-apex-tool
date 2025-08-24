import { FastifyPluginAsync } from 'fastify';
import { store } from '../store';
import { recipientsSchema } from '../schemas/recipients';

export const notifyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/notify/recipients', async (req, reply) => {
    const p = recipientsSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const r = store.addRecipients(p.data as any);
    return { ok: true, recipients: r };
  });
};

export default notifyRoutes;
