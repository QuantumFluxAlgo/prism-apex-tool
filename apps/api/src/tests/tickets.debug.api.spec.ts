import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServerTicketsDebug } from './testServerTicketsDebug.js';
import { appendTickets, type MockTicket } from '../utils/mockStore.js';
import { emitTicketQualityTelemetry } from '../services/tickets/ticketsTelemetry.js';

vi.mock('../services/tickets/ticketsTelemetry.js', async () => {
  const actual = await vi.importActual<typeof import('../services/tickets/ticketsTelemetry.js')>(
    '../services/tickets/ticketsTelemetry.js',
  );
  return {
    ...actual,
    emitTicketQualityTelemetry: vi.fn(),
  };
});

const mockedTelemetry = vi.mocked(emitTicketQualityTelemetry);
const TEST_DATA_DIR = path.join(process.cwd(), 'var', 'mock-api-tests', 'tickets-debug-api');

describe('GET /tickets/debug – quality filters + telemetry', () => {
  let app: FastifyInstance;
  let originalDataDir: string | undefined;

  const resetMockStore = (): void => {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  };

  beforeAll(async () => {
    originalDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = TEST_DATA_DIR;
    process.env.TEST_MODE = '1';
    resetMockStore();
    app = await buildTestServerTicketsDebug();
  });

  beforeEach(() => {
    resetMockStore();
    mockedTelemetry.mockReset();
  });

  afterAll(async () => {
    await app.close();
    resetMockStore();
    if (originalDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = originalDataDir;
    }
  });

  it('applies minEntryRR filter and emits telemetry with route metadata and counts', async () => {
    const sampleTickets: MockTicket[] = [
      {
        id: 't1',
        ts: '2023-01-01T00:00:00Z',
        symbol: 'MES',
        strategy: 'VWAP-FT',
        side: 'LONG',
        price: 100,
        size: 1,
        status: 'ACCEPTED',
        meta: { rrMultiple: 0.5 },
      },
      {
        id: 't2',
        ts: '2023-01-01T00:00:01Z',
        symbol: 'MES',
        strategy: 'VWAP-FT',
        side: 'LONG',
        price: 100,
        size: 1,
        status: 'ACCEPTED',
        meta: { rrMultiple: 2 },
      },
      {
        id: 't3',
        ts: '2023-01-01T00:00:02Z',
        symbol: 'MES',
        strategy: 'VWAP-FT',
        side: 'LONG',
        price: 100,
        size: 1,
        status: 'ACCEPTED',
        meta: { rrMultiple: 1 },
      },
    ];
    appendTickets(sampleTickets);

    const minEntryRR = 1.5;

    const res = await app.inject({
      method: 'GET',
      url: `/tickets/debug?minEntryRR=${minEntryRR}`,
    });

    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBe(1);

    const ids = payload.map((ticket: any) => ticket.id);
    expect(ids).toContain('t2');
    expect(ids).not.toContain('t1');
    expect(ids).not.toContain('t3');

    expect(mockedTelemetry).toHaveBeenCalledTimes(1);
    const [ctx] = mockedTelemetry.mock.calls[0] ?? [];
    expect(ctx).toBeDefined();
    expect(ctx.route).toBe('tickets-debug');
    expect(ctx.filters).toMatchObject({ minEntryRR });
    expect(ctx.totalBefore).toBe(sampleTickets.length);
    expect(ctx.totalAfter).toBe(payload.length);
    expect(ctx.totalAfter).toBeLessThanOrEqual(ctx.totalBefore);
  });
});

