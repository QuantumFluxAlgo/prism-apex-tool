import { describe, it, expect, vi, beforeAll } from 'vitest';
import { join, dirname } from 'node:path';
import { mkdirSync, appendFileSync } from 'node:fs';
import request from 'supertest';

vi.mock('@prism-apex/data-yahoo', () => ({
  barsFile: (base: string, sym: string, day: string) => join(base, `${sym}.${day}.jsonl`),
  appendJSONL: (path: string, obj: any) => {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(obj) + '\n');
  },
  stepAVWAP: (s: any, h: number, l: number, c: number, v: number) => {
    const price = (h + l + c) / 3;
    return { tpv: (s.tpv ?? 0) + price * v, vol: (s.vol ?? 0) + v, anchorISO: s.anchorISO ?? '' };
  },
  valueAVWAP: (s: any) => (s.vol ? s.tpv / s.vol : NaN),
}));
vi.mock('@prism-apex/strategy-apx-ddb01', () => ({
  planLongOnlyRetest: (opts: any) => ({
    entry: opts.currentPrice,
    stopTicks: opts.minStopTicks,
    rr: opts.rr,
    notes: 'mock',
  }),
}));
vi.mock('@prism-apex/risk-state', () => ({
  canAfford: () => true,
  addRisk: () => {},
  resetIfNewDay: () => {},
}));

process.env.APEX_ENABLE_YAHOO_INGRESS = 'true';
process.env.APEX_YAHOO_SHARED_SECRET = 's3cr3t';

let app: any;
beforeAll(async () => {
  app = (await import('../src/server')).default;
});

describe('ingress/yahoo', () => {
  it('rejects without secret', async () => {
    const r = await request(app).post('/ingress/yahoo/v1/bar').send({});
    expect(r.status).toBe(401);
  });

  it('skips zero volume', async () => {
    const r = await request(app)
      .post('/ingress/yahoo/v1/bar')
      .set('x-apex-secret', 's3cr3t')
      .send({
        symbol: 'ES=F',
        ts: '2025-09-12T14:31:00Z',
        high: 10,
        low: 9,
        close: 9.5,
        volume: 0,
      });
    expect(r.status).toBe(200);
    expect(r.body.skipped || r.body?.skipped).toBeDefined();
  });

  it('accepts a plausible bar payload', async () => {
    await request(app)
      .post('/ingress/yahoo/v1/bar')
      .set('x-apex-secret', 's3cr3t')
      .send({
        symbol: 'ES=F',
        ts: '2025-09-11T14:31:00Z',
        high: 5334.75,
        low: 5330.25,
        close: 5332.0,
        volume: 1000,
      });
    const r = await request(app)
      .post('/ingress/yahoo/v1/bar')
      .set('x-apex-secret', 's3cr3t')
      .send({
        symbol: 'ES=F',
        ts: '2025-09-12T14:31:00Z',
        high: 5335.0,
        low: 5331.0,
        close: 5333.0,
        volume: 1200,
      });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    if (r.body.ticket) {
      expect(r.body.ticket.symbol).toMatch(/^MES/);
      expect(r.body.ticket.side).toBe('Buy');
      expect(r.body.ticket.entry.price).toBeDefined();
    }
  });
});
