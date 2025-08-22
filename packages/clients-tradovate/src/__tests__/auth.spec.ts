import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenManager } from '../auth';
import { TradovateClientError } from '../types';

const CFG = {
  baseUrl: 'https://example.test/v1',
  username: 'user',
  password: 'pass',
  clientId: 'cid',
  clientSecret: 'sec',
};

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
});

describe('TokenManager', () => {
  it('fails login after retries', async () => {
    mockFetchSequence([
      { status: 500, json: {} },
      { status: 500, json: {} },
      { status: 500, json: {} },
    ]);
    const tm = new TokenManager(CFG);
    await expect(tm.getAccessToken()).rejects.toThrow(TradovateClientError);
    expect((globalThis.fetch as any).mock.calls.length).toBe(3);
  });

  it('throws on malformed login response', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: '', refreshToken: 'r', expiresIn: 3600 } },
    ]);
    const tm = new TokenManager(CFG);
    await expect(tm.getAccessToken()).rejects.toThrow(TradovateClientError);
  });

  it('throws on malformed refresh response', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 1 } }, // login
      { status: 200, json: { accessToken: '', refreshToken: 'r2', expiresIn: 3600 } }, // refresh bad
    ]);
    const tm = new TokenManager(CFG);
    await tm.getAccessToken();
    await expect(tm.getAccessToken()).rejects.toThrow(TradovateClientError);
  });
});

