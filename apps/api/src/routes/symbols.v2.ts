import type { FastifyInstance } from 'fastify';
import { loadContractsSpec } from '@prism-apex/shared/contracts';

export default async function symbolsV2Route(app: FastifyInstance): Promise<void> {
  app.get('/api/symbols/v2', async () => {
    const cfg = await loadContractsSpec();
    return {
      symbols: cfg.symbols.map((spec) => ({
        symbol: spec.symbol,
        description: spec.description,
        tickSize: spec.tickSize,
        tickValueUSD: spec.tickValueUSD,
        contractType: spec.contractType,
        feedAvailable: spec.feedAvailable,
        tickSpecVerified: spec.tickSpecVerified,
      })),
    };
  });
}
