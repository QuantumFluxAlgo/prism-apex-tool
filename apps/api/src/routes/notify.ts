import { FastifyPluginAsync } from 'fastify';
import { recipientsSchema } from '../schemas/recipients';
import { store } from '../store';

export const notifyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/notify/recipients', async (req, reply) => {
    const body = recipientsSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid payload' });
    const recipients = store.addRecipients(body.data as any);
    return recipients;
  });
};

export default notifyRoutes;
