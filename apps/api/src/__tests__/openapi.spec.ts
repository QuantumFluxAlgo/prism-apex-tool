import { beforeEach, describe, expect, it, vi } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  vi.resetModules();
  process.env.FLAT_BY_UTC = '23:59';
  ({ buildServer } = await import('../server.js'));
});

describe('OpenAPI', () => {
  it('serves openapi.json with expected paths and bearer scheme', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toBeDefined();
    const paths = Object.keys(doc.paths || {});
    expect(paths).toEqual(
      expect.arrayContaining([
        '/market/symbols',
        '/market/sessions',
        '/signals/osb',
        '/signals/vwap-first-touch',
        '/report/daily',
        '/tickets',
        '/tickets/promote',
      ]),
    );
    // Bearer security scheme should be present & applied
    expect(doc.components?.securitySchemes?.BearerAuth).toBeDefined();
    expect(Array.isArray(doc.security)).toBe(true);
  });
});
