import { beforeEach, describe, expect, it } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  ({ buildServer } = await import('../server.js'));
});

describe('OpenAPI', () => {
  it('serves openapi.json with expected paths', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toBeDefined();
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/market/symbols',
        '/market/sessions',
        '/signals/osb',
        '/signals/vwap-first-touch',
        '/report/daily',
      ]),
    );
  });
});
