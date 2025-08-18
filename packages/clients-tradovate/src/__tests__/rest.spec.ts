import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradovateClient } from '../rest';
import { TradovateClientError } from '../types';

// Mock env
const BASE = 'https://example.test/v1';
const ENV = {
  TRADOVATE_BASE_URL: BASE,
  TRADOVATE_USERNAME: 'user',
  TRADOVATE_PASSWORD: 'pass',
  TRADOVATE_CLIENT_ID: 'cid',
  TRADOVATE_CLIENT_SECRET: 'sec',
};

function setEnv() {
  process.env.TRADOVATE_BASE_URL = ENV.TRADOVATE_BASE_URL;
  process.env.TRADOVATE_USERNAME = ENV.TRADOVATE_USERNAME;
  process.env.TRADOVATE_PASSWORD = ENV.TRADOVATE_PASSWORD;
  process.env.TRADOVATE_CLIENT_ID = ENV.TRADOVATE_CLIENT_ID;
  process.env.TRADOVATE_CLIENT_SECRET = ENV.TRADOVATE_CLIENT_SECRET;
}

function mockFetchSequence(responses: { status: number; json: any }[]) {
  let i = 0;
  (globalThis as any).fetch = vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json,
    } as Response;
  });
}

beforeEach(() => {
  vi.useRealTimers();
  setEnv();
});

describe('TradovateClient read-only', () => {
  it('logs in then fetches account', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } }, // login
      {
        status: 200,
        json: {
          netLiq: 52000,
          cash: 52000,
          margin: 0,
          dayPnlRealized: 0,
          dayPnlUnrealized: 0,
        },
      }, // account
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    const acct = await c.getAccount();
    expect(acct.netLiq).toBe(52000);
  });

  it('refreshes token on 401 then retries', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 1 } }, // login (short TTL)
      { status: 401, json: {} }, // account first attempt -> 401
      { status: 200, json: { accessToken: 'a2', refreshToken: 'r2', expiresIn: 3600 } }, // refresh
      {
        status: 200,
        json: {
          netLiq: 51000,
          cash: 51000,
          margin: 0,
          dayPnlRealized: 0,
          dayPnlUnrealized: 0,
        },
      }, // account retry
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    const acct = await c.getAccount();
    expect(acct.netLiq).toBe(51000);
  });

  it('retries on 429/5xx and eventually succeeds', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } }, // login
      { status: 429, json: {} }, // bars #1 -> retry
      { status: 500, json: {} }, // bars #2 -> retry
      {
        status: 200,
        json: [
          {
            ts: '2025-08-17T13:30:00.000Z',
            symbol: 'ES',
            interval: '1m',
            o: 1,
            h: 2,
            l: 0.5,
            c: 1.5,
            v: 100,
          },
        ],
      }, // bars ok
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    const bars = await c.getBars('ES', '1m', 1);
    expect(bars.length).toBe(1);
  });

  it('validates schemas and throws on malformed JSON', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } }, // login
      { status: 200, json: { netLiq: 'bad', cash: 1, margin: 0, dayPnlRealized: 0, dayPnlUnrealized: 0 } }, // invalid
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    await expect(c.getAccount()).rejects.toThrow(TradovateClientError);
  });

  it('caches bars for TTL and avoids duplicate fetch', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } }, // login
      {
        status: 200,
        json: [
          {
            ts: '2025-08-17T13:30:00.000Z',
            symbol: 'ES',
            interval: '1m',
            o: 1,
            h: 2,
            l: 0.5,
            c: 1.5,
            v: 100,
          },
        ],
      }, // bars #1
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    const b1 = await c.getBars('ES', '1m', 1);
    const fetchCallsAfter = (globalThis.fetch as any).mock.calls.length;
    const b2 = await c.getBars('ES', '1m', 1);
    const fetchCallsNow = (globalThis.fetch as any).mock.calls.length;
    expect(b2).toEqual(b1);
    expect(fetchCallsNow).toBe(fetchCallsAfter); // no extra fetch due to cache
  });

  it('fetches positions, orders, and last price', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: [{ symbol: 'ES', qty: 1, avgPrice: 1, unrealizedPnl: 0 }] }, // positions
      {
        status: 200,
        json: [
          {
            id: 1,
            symbol: 'ES',
            side: 'BUY',
            type: 'MARKET',
            status: 'FILLED',
          },
        ],
      }, // orders
      { status: 200, json: { symbol: 'ES', last: 100, ts: '2025-08-17T13:30:00.000Z' } }, // last
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    const pos = await c.getPositions();
    const ord = await c.getOrders();
    const last = await c.getLast('ES');
    expect(pos[0].symbol).toBe('ES');
    expect(ord[0].id).toBe('1');
    expect(last.last).toBe(100);
  });

  it('throws after retries for persistent server errors', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 500, json: {} },
      { status: 500, json: {} },
      { status: 500, json: {} },
    ]);
    const c = new TradovateClient({ baseUrl: BASE });
    await expect(c.getAccount()).rejects.toThrow(TradovateClientError);
  });

  it('throws if base URL env missing', async () => {
    delete process.env.TRADOVATE_BASE_URL;
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
    ]);
    expect(() => new TradovateClient()).toThrow(TradovateClientError);
  });
});

