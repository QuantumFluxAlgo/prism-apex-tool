import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { setClientFactory } from '../jobs/feed.js';

describe('feed ready status', () => {
  it('reports marketFeed connected', async () => {
    process.env.FEED_SYMBOLS = 'ESZ4';
    setClientFactory(async () => ({
      subscribeBars: () => {},
      subscribeQuotes: () => {},
      unsubscribe: () => {},
      getContractMeta: async () => ({}),
      close: () => {},
    }));
    const app = buildServer();
    await new Promise((res) => setTimeout(res, 0));
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json()).toEqual({ ok: true, marketFeed: { connected: true, subs: 2 } });
    await app.close();
    delete process.env.FEED_SYMBOLS;
  });
});
