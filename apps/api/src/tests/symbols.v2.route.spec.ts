import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import symbolsV2Route from '../routes/symbols.v2';
import { loadContractsSpec } from '@prism-apex/shared/contracts';

describe('GET /api/symbols/v2', () => {
  it('serves contract specs sourced from config/contracts-spec.json', async () => {
    const app = Fastify({ logger: false });
    await app.register(symbolsV2Route);

    const response = await app.inject({ method: 'GET', url: '/api/symbols/v2' });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { symbols?: Array<Record<string, unknown>> };
    expect(Array.isArray(body.symbols)).toBe(true);

    const config = await loadContractsSpec();
    const expectedLength = Array.isArray(config.symbols) ? config.symbols.length : 0;
    expect(body.symbols?.length ?? 0).toBe(expectedLength);

    if (expectedLength > 0) {
      const sample = body.symbols?.[0] as Record<string, unknown>;
      expect(sample).toEqual(
        expect.objectContaining({
          symbol: expect.any(String),
          tickSize: expect.any(Number),
          tickValueUSD: expect.any(Number),
          contractType: expect.any(String),
          feedAvailable: expect.any(Boolean),
          tickSpecVerified: expect.any(Boolean),
        }),
      );
    }
  }, 20_000);
});
