import type { FastifyInstance } from 'fastify';

const DEFAULT_SYMBOLS = [
  'ES=F',
  'MES=F',
  'NQ=F',
  'MNQ=F',
  'YM=F',
  'RTY=F',
  'GC=F',
  'CL=F',
  '6E=F',
  'EURUSD=X',
  '^GDAXI',
];

export default async function symbolsRoute(app: FastifyInstance) {
  app.get('/api/symbols', async () => {
    const seeded = new Set<string>(DEFAULT_SYMBOLS);
    const sources = [process.env.STATUS_SYMBOLS, process.env.YAHOO_SYMBOLS, process.env.YF_SYMBOLS];

    for (const src of sources) {
      if (!src) continue;
      src
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((symbol) => seeded.add(symbol));
    }

    const ordered = [...DEFAULT_SYMBOLS];
    const remainder = Array.from(seeded)
      .filter((symbol) => !ordered.includes(symbol))
      .sort((a, b) => a.localeCompare(b));

    return { symbols: [...ordered, ...remainder] };
  });
}
