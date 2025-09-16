import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sampleTicket = {
  symbol: 'MESZ5',
  side: 'BUY' as const,
  entry: 5550.25,
  stop: 5544.25,
  target: 5560.25,
  qty: 2,
  accountId: 'APEX-123456',
  timestampUtc: '2025-09-09T14:31:22Z',
  meta: {
    strategy: 'VWAP_FT' as const,
    rr: 1.5,
    guardrails: ['rrInRange'],
    sizingHint: 'half-size',
    consistencyNotes: 'test',
  },
  accepted: true,
  reasons: [],
};

describe('tickets disk sync job', () => {
  let tmpDir: string;
  let ticketsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pat-sync-'));
    ticketsDir = path.join(tmpDir, 'tickets');
    process.env.DATA_DIR = tmpDir;
    process.env.TICKETS_DIR = ticketsDir;
    fs.mkdirSync(ticketsDir, { recursive: true });
    vi.resetModules();
  });

  afterEach(async () => {
    const store = await import('../../store/tickets.js');
    store._clear();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
    delete process.env.TICKETS_DIR;
    vi.resetModules();
  });

  it('imports ticket files into the JSONL store', async () => {
    const day = sampleTicket.timestampUtc.slice(0, 10);
    const dayDir = path.join(ticketsDir, day);
    fs.mkdirSync(dayDir, { recursive: true });
    fs.writeFileSync(path.join(dayDir, 'ticket-1.json'), JSON.stringify(sampleTicket, null, 2));

    const store = await import('../../store/tickets.js');
    store._clear();

    const { syncTicketsFromDisk, resetTicketsDiskSyncState } = await import('../ticketsDiskSync.js');
    resetTicketsDiskSyncState();

    const processed = await syncTicketsFromDisk({ rootDir: ticketsDir });
    expect(processed).toBe(1);

    const result = store.listTickets(day, 0, 10);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].symbol).toBe(sampleTicket.symbol);
  });
});
