import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bar } from '@prism-apex-tool/signals';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  vi.resetModules();
  ({ buildServer } = await import('../server.js'));
});

describe('Signals API', () => {
  it('returns OSB suggestion', async () => {
    const bars: Bar[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: `2020-01-01T00:${String(i).padStart(2, '0')}:00Z`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
      })),
      { ts: '2020-01-01T00:10:00Z', open: 100, high: 106, low: 99, close: 106 },
    ];
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/signals/osb', payload: { symbol: 'ES', session: 'RTH', bars } });
    expect(res.statusCode).toBe(200);
    expect(res.json().suggestions.length).toBe(1);
  });

  it('returns VWAP first touch suggestion', async () => {
    const bars: Bar[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: `2020-01-01T01:${String(i).padStart(2, '0')}:00Z`,
        open: 1,
        high: 2,
        low: 1,
        close: 1,
        volume: 1,
      })),
      { ts: '2020-01-01T01:10:00Z', open: 1, high: 2, low: 1, close: 2, volume: 1 },
    ];
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/signals/vwap-first-touch', payload: { symbol: 'ES', bars } });
    expect(res.statusCode).toBe(200);
    expect(res.json().suggestions.length).toBe(1);
  });
});
