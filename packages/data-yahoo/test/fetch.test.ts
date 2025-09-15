import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchYahooBars } from '../src/fetch.js';
import { appendJSONL, barsFile } from '../src/io.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

describe('fetchYahooBars', () => {
  let fetchStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests Yahoo chart data and normalizes bars', async () => {
    const startMs = Date.UTC(2024, 0, 1);
    const timestamps = [0, 1, 2].map((i) => Math.floor((startMs + i * 24 * 60 * 60 * 1000) / 1000));

    fetchStub.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        chart: {
          result: [
            {
              meta: { symbol: 'AAPL' },
              timestamp: timestamps,
              indicators: {
                quote: [
                  {
                    high: [190.1, 191.2, 192.3],
                    low: [188.5, 189.4, 190.6],
                    close: [189.9, 190.8, 191.7],
                    volume: [100_000_000, 120_000_000, null],
                  },
                ],
              },
            },
          ],
        },
      }),
    } as unknown as Response);

    const from = new Date(startMs);
    const to = new Date(startMs + 2 * 24 * 60 * 60 * 1000);
    const bars = await fetchYahooBars('AAPL', from, to);

    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url] = fetchStub.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname.endsWith('/AAPL')).toBe(true);
    expect(parsed.searchParams.get('interval')).toBe('1d');
    expect(parsed.searchParams.get('period1')).toBe(String(Math.floor(startMs / 1000)));
    expect(parsed.searchParams.get('period2')).toBe(
      String(Math.floor((to.getTime() + 24 * 60 * 60 * 1000 - 1) / 1000)),
    );

    expect(bars).toHaveLength(2);
    expect(bars[0]).toEqual({
      symbol: 'AAPL',
      ts: new Date(timestamps[0] * 1000).toISOString(),
      high: 190.1,
      low: 188.5,
      close: 189.9,
      volume: 100_000_000,
    });
    expect(bars[1].symbol).toBe('AAPL');
  });

  it('integrates with file helpers to persist JSONL caches', async () => {
    const startMs = Date.UTC(2024, 0, 1);
    const timestamps = [0, 1].map((i) => Math.floor((startMs + i * 24 * 60 * 60 * 1000) / 1000));

    fetchStub.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        chart: {
          result: [
            {
              meta: { symbol: 'MSFT' },
              timestamp: timestamps,
              indicators: {
                quote: [
                  {
                    high: [340.1, 341.2],
                    low: [338.4, 339.6],
                    close: [339.8, 340.9],
                    volume: [90_000_000, 95_000_000],
                  },
                ],
              },
            },
          ],
        },
      }),
    } as unknown as Response);

    const bars = await fetchYahooBars(
      'MSFT',
      new Date(startMs),
      new Date(startMs + 24 * 60 * 60 * 1000),
    );

    const tmp = mkdtempSync(join(dirname(fileURLToPath(import.meta.url)), 'yahoo-bars-'));
    try {
      for (const bar of bars) {
        const file = barsFile(tmp, bar.symbol, bar.ts.slice(0, 10));
        appendJSONL(file, bar);
      }

      const firstDayPath = barsFile(tmp, 'MSFT', '2024-01-01');
      const secondDayPath = barsFile(tmp, 'MSFT', '2024-01-02');

      const firstDayLines = readFileSync(firstDayPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      const secondDayLines = readFileSync(secondDayPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      expect(firstDayLines).toEqual([bars[0]]);
      expect(secondDayLines).toEqual([bars[1]]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
