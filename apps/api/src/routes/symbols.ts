import type { FastifyInstance } from 'fastify';
export default async function symbolsRoute(app: FastifyInstance) {
  app.get('/api/symbols', async () => {
    const raw = process.env.YAHOO_SYMBOLS ?? 'ES=F,NQ=F,GC=F,CL=F';
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    return { symbols: list };
  });
}
