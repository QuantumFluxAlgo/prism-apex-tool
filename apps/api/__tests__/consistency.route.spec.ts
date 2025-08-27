import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import consistencyRoute from '../src/routes/consistency';

const VAR_DIR = path.resolve(process.cwd(), 'var', 'pnl');
const FILE = path.join(VAR_DIR, 'daily.json');

function writeDaily(json: unknown) {
  fs.mkdirSync(VAR_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(json, null, 2));
}

function rmDaily() {
  try {
    fs.unlinkSync(FILE);
  } catch {}
}

describe('GET /report/consistency', () => {
  beforeEach(() => rmDaily());
  afterEach(() => rmDaily());

  it('returns 204 when no data present', async () => {
    const app = Fastify();
    app.register(consistencyRoute);
    const res = await app.inject({ method: 'GET', url: '/report/consistency?window=8' });
    expect(res.statusCode).toBe(204);
  });

  it('returns 200 with computed metrics when data present', async () => {
    writeDaily([
      { date: '2025-08-12', pnl: -80 },
      { date: '2025-08-13', pnl: 250 },
      { date: '2025-08-14', pnl: 180 },
      { date: '2025-08-15', pnl: 90 },
      { date: '2025-08-18', pnl: 410 },
      { date: '2025-08-19', pnl: 95 },
      { date: '2025-08-20', pnl: 200 },
      { date: '2025-08-21', pnl: 275 },
    ]);
    const app = Fastify();
    app.register(consistencyRoute);
    const res = await app.inject({ method: 'GET', url: '/report/consistency?window=8' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.window).toBe(8);
    expect(body.totalPnL).toBe(1420);
    expect(body.bestDayPnL).toBe(410);
    expect(body.bestDayShare).toBeCloseTo(410 / 1420, 6);
    expect(body.profitDayCount).toBe(7);
    expect(body.eligible).toBe(true);
  });
});
