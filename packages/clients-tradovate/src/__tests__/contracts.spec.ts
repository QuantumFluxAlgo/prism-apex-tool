import { describe, expect, it, vi } from 'vitest';
import { getContractMeta } from '../contracts.js';

describe('getContractMeta', () => {
  it('parses metadata fields', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickSize: 0.25, tickValue: 12.5, minTick: 0.25, multiplier: 50 }),
    });
    vi.stubGlobal('fetch', mock as any);
    const meta = await getContractMeta('http://x', 'ESZ4');
    expect(meta).toEqual({
      fullSymbol: 'ESZ4',
      tickSize: 0.25,
      tickValue: 12.5,
      minTick: 0.25,
      multiplier: 50,
    });
    vi.unstubAllGlobals();
  });
});
