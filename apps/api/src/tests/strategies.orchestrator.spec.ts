import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { publish, subscribe } from '../lib/bus.js';
import {
  startStrategies,
  stopStrategies,
  strategies,
  type BarMessage,
} from '../jobs/strategies.js';
import Fastify from 'fastify';

vi.mock('@prism-apex-tool/strategies', () => ({
  vwapFirstTouch: (symbol: string, bars: any[], _vwap: number[], _atr: number[], _tick: any) => {
    const last = bars[bars.length - 1];
    if (last.close === 101) {
      return [
        {
          symbol,
          side: 'BUY',
          entry: last.close,
          stop: last.close - 1,
          target: last.close + 2,
          timestampUtc: last.ts,
          meta: { strategy: 'VWAP_FT', rr: 2 },
        },
      ];
    }
    if (last.close === 99) {
      return [
        {
          symbol,
          side: 'SELL',
          entry: last.close,
          stop: last.close + 1,
          target: last.close - 2,
          timestampUtc: last.ts,
          meta: { strategy: 'VWAP_FT', rr: 2 },
        },
      ];
    }
    return [];
  },
  openingSwingBreakout: (symbol: string, bars: any[], _atr: number[], _tick: any) => {
    const last = bars[bars.length - 1];
    if (last.close === 102) {
      return [
        {
          symbol,
          side: 'BUY',
          entry: last.close,
          stop: last.close - 1,
          target: last.close + 2,
          timestampUtc: last.ts,
          meta: { strategy: 'OSB', rr: 2 },
        },
      ];
    }
    if (last.close === 98) {
      return [
        {
          symbol,
          side: 'SELL',
          entry: last.close,
          stop: last.close + 1,
          target: last.close - 2,
          timestampUtc: last.ts,
          meta: { strategy: 'OSB', rr: 2 },
        },
      ];
    }
    return [];
  },
}));

function loadCsv(name: string): BarMessage[] {
  const lines = fs
    .readFileSync(path.join(__dirname, '../../fixtures', name), 'utf8')
    .trim()
    .split(/\n/)
    .slice(1);
  return lines.map((l) => {
    const [symbol, contract, ts, open, high, low, close, volume, session] = l.split(',');
    return {
      symbol,
      contract,
      ts,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
      session: session as 'RTH' | 'ETH',
    };
  });
}

describe('strategy orchestrator', () => {
  const suggestions: any[] = [];
  let unsub: () => void;

  beforeAll(async () => {
    await startStrategies();
    unsub = subscribe('suggestion', (s) => suggestions.push(s));
  });

  afterAll(async () => {
    unsub();
    await stopStrategies();
  });

  it('replays fixtures and publishes suggestions once per direction', () => {
    const a = loadCsv('session_a.csv');
    for (const b of a) publish('bars.1m', b);
    const b = loadCsv('session_b.csv');
    for (const bar of b) publish('bars.1m', bar);
    expect(suggestions.map((s) => s.meta.strategy)).toEqual(['OSB', 'VWAP_FT', 'OSB', 'VWAP_FT']);
    expect(suggestions.map((s) => s.side)).toEqual(['BUY', 'BUY', 'SELL', 'SELL']);
  });

  it('ready route exposes heartbeat', async () => {
    const app = Fastify();
    app.get('/ready', async () => ({ strategies }));
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    expect(body.strategies.running).toBe(true);
    await app.close();
  });
});
