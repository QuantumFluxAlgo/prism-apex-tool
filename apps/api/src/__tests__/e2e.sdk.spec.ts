import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildServer } from '../server.js';
import { PrismApexClient } from '@prism-apex-tool/sdk';
import type { Bar } from '@prism-apex-tool/sdk';

describe('E2E SDK→API smoke', () => {
  let app: ReturnType<typeof buildServer>;
  let baseUrl: string;
  let client: PrismApexClient;

  beforeAll(async () => {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'));
    app = buildServer();
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' }); // e.g. http://127.0.0.1:54321
    client = new PrismApexClient(baseUrl);
  });

  afterAll(async () => {
    await app.close(); // triggers onClose hook to stop jobs
  });

  it('market endpoints respond', async () => {
    const symbols = await client.getSymbols();
    expect(symbols.symbols).toEqual(['ES', 'NQ', 'MES', 'MNQ']);

    const sessions = await client.getSessions();
    expect(sessions.RTH.start).toBe('13:30');
    expect(sessions.ETH.end).toBe('21:00');
  });

  it('signals → promote → list → export CSV', async () => {
    // --- OSB suggestion ---
    const barsOSB: Bar[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: `2025-01-01T00:${String(i).padStart(2, '0')}:00Z`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
      })),
      { ts: '2025-01-01T00:10:00Z', open: 100, high: 106, low: 99, close: 106 },
    ];
    const osb = await client.osb({ symbol: 'ES', session: 'RTH', bars: barsOSB });
    expect(osb.suggestions.length).toBeGreaterThan(0);
    const suggestion = osb.suggestions[0]!;

    // --- Promote suggestion to ticket ---
    const when = '2025-01-01T00:10:00Z';
    const promote = await fetch(new URL('/tickets/promote', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ suggestion, when, reasons: ['e2e'] }),
    });
    expect(promote.ok).toBe(true);

    // --- List tickets for date ---
    const listRes = await fetch(new URL('/tickets?date=2025-01-01', baseUrl));
    expect(listRes.ok).toBe(true);
    const tickets = await listRes.json();
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);

    // --- Export CSV ---
    const csvRes = await fetch(new URL('/export/tickets?date=2025-01-01', baseUrl));
    expect(csvRes.ok).toBe(true);
    const ct = csvRes.headers.get('content-type') ?? '';
    expect(ct.includes('text/csv')).toBe(true);
    const csv = await csvRes.text();
    expect(csv).toContain('symbol');
    expect(csv).toContain('ES');
  });

  it('VWAP First-Touch suggestion responds', async () => {
    const bars: Bar[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: `2025-01-01T01:${String(i).padStart(2, '0')}:00Z`,
        open: 1,
        high: 2,
        low: 1,
        close: 1,
        volume: 1,
      })),
      { ts: '2025-01-01T01:10:00Z', open: 1, high: 2, low: 1, close: 2, volume: 1 },
    ];
    const res = await client.vwapFirstTouch({ symbol: 'ES', bars });
    expect(res.suggestions.length).toBeGreaterThan(0);
  });
});
