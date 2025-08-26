import { beforeEach, describe, expect, it, vi } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  vi.resetModules();
  ({ buildServer } = await import('../server.js'));
});

describe('Market API', () => {
  it('lists symbols', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/market/symbols' });
    expect(res.statusCode).toBe(200);
    expect(res.json().symbols).toEqual(['ES', 'NQ', 'MES', 'MNQ']);
  });

  it('lists sessions', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/market/sessions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.RTH.start).toBe('13:30');
    expect(body.ETH.end).toBe('21:00');
  });
});
