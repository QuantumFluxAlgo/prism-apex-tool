import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { jobManager } from '@prism-apex/app-api/jobs/jobManager.js';
import { resetSchedulerForTests } from '@prism-apex/app-api/jobs/scheduler.js';
import type { Ticket } from '@prism-apex/app-api/store.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('@prism-apex/app-api/server.js').buildServer;
let store: typeof import('@prism-apex/app-api/store/tickets.js');

beforeEach(async () => {
  jobManager.resetForTests();
  resetSchedulerForTests();
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tickets-'));
  ({ buildServer } = await import('@prism-apex/app-api/server.js'));
  store = await import('@prism-apex/app-api/store/tickets.js');
  store._clear();
});

afterEach(() => {
  resetSchedulerForTests();
  jobManager.resetForTests();
});

describe('ticket store', () => {
  it('deduplicates identical tickets', async () => {
    const t: Ticket = {
      symbol: 'ESZ4',
      side: 'BUY',
      entry: 100,
      stop: 99,
      target: 102,
      qty: 1,
      accountId: 'A1',
      timestampUtc: '2024-01-01T10:00:00Z',
      meta: { strategy: 'VWAP_FT', rr: 2, guardrails: [] },
      accepted: true,
    };
    await store.saveTicket(t);
    await store.saveTicket(t);
    const { items } = store.listTickets('2024-01-01');
    expect(items).toHaveLength(1);
  });

  it('paginates results', async () => {
    const base: Ticket = {
      symbol: 'ESZ4',
      side: 'BUY',
      entry: 100,
      stop: 99,
      target: 102,
      qty: 1,
      accountId: 'A1',
      timestampUtc: '2024-01-01T10:00:00Z',
      meta: { strategy: 'VWAP_FT', rr: 2, guardrails: [] },
      accepted: true,
    };
    for (let i = 0; i < 3; i++) {
      await store.saveTicket({ ...base, timestampUtc: `2024-01-01T10:0${i}:00Z` });
    }
    const app = buildServer();
    const page1 = await app.inject({ method: 'GET', url: '/tickets?date=2024-01-01&limit=2' });
    const body1 = page1.json();
    expect(body1.tickets).toHaveLength(2);
    expect(body1.nextCursor).toBe(2);
    const page2 = await app.inject({
      method: 'GET',
      url: '/tickets?date=2024-01-01&cursor=2&limit=2',
    });
    const body2 = page2.json();
    expect(body2.tickets).toHaveLength(1);
    expect(body2.nextCursor).toBeNull();
    await app.close();
  });

  it('exports CSV with strategy column', async () => {
    const t: Ticket = {
      symbol: 'ESZ4',
      side: 'BUY',
      entry: 100,
      stop: 99,
      target: 102,
      qty: 1,
      accountId: 'A1',
      timestampUtc: '2024-01-01T10:00:00Z',
      meta: { strategy: 'VWAP_FT', rr: 2, guardrails: [] },
      accepted: true,
    };
    await store.saveTicket(t);
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/export/tickets?date=2024-01-01' });
    expect(res.headers['content-type']).toContain('text/csv');
    const [header, row] = res.body.split('\n');
    expect(header).toContain('meta.strategy');
    expect(row).toContain('VWAP_FT');
    await app.close();
  });
});
