import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publish, subscribe } from '@prism-apex/app-api/lib/bus.js';
import {
  startStrategies,
  stopStrategies,
  type BarMessage,
} from '@prism-apex/app-api/jobs/strategies.js';

vi.mock('@prism-apex/strategies', () => ({
  vwapFirstTouch: (
    symbol: string,
    bars: any[],
    _vwap: number[],
    _atr: number[],
    _tick: any,
  ) => {
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
  openingSwingBreakout: (
    symbol: string,
    bars: any[],
    _atr: number[],
    _tick: any,
  ) => {
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

let ddbEmitted = false;
vi.mock('@prism-apex/strategy-apx-ddb01', () => ({
  planLongOnlyRetest: (opts: { currentPrice: number; tickSize: number }) => {
    if (ddbEmitted || opts.currentPrice < 103) return null;
    ddbEmitted = true;
    return {
      entry: opts.currentPrice,
      stopTicks: 12,
      rr: 3,
      notes: 'mock-ddb',
    };
  },
}));

const fixturesDir = fileURLToPath(new URL('../../fixtures', import.meta.url));
const configPath = join(fixturesDir, 'strategies.config.json');

const FALLBACK_FIXTURES: Record<string, string> = {
  'session_a.csv': [
    'symbol,contract,ts,open,high,low,close,volume,session',
    'ES,ESZ4,2024-01-01T14:30:00Z,100,101,99.5,100,1000,RTH',
    'ES,ESZ4,2024-01-01T14:31:00Z,100,101.5,99.8,100.5,1000,RTH',
    'ES,ESZ4,2024-01-01T14:32:00Z,100.5,101.8,100,100.8,1000,RTH',
    'ES,ESZ4,2024-01-01T14:33:00Z,100.8,102,100.4,101.2,1000,RTH',
    'ES,ESZ4,2024-01-01T14:34:00Z,101.2,102.2,100.7,101.5,1000,RTH',
    'ES,ESZ4,2024-01-01T14:35:00Z,101.5,103,100.9,102,1000,RTH',
    'ES,ESZ4,2024-01-01T14:36:00Z,102,103,100.5,101,1000,RTH',
  ].join('\n'),
  'session_b.csv': [
    'symbol,contract,ts,open,high,low,close,volume,session',
    'ES,ESZ4,2024-01-02T14:30:00Z,100,101,99.4,100,1000,RTH',
    'ES,ESZ4,2024-01-02T14:31:00Z,100,101,99,100.2,1000,RTH',
    'ES,ESZ4,2024-01-02T14:32:00Z,100.2,101,99.2,100.1,1000,RTH',
    'ES,ESZ4,2024-01-02T14:33:00Z,100.1,100.9,99,100,1000,RTH',
    'ES,ESZ4,2024-01-02T14:34:00Z,100,101,98.8,100.05,1000,RTH',
    'ES,ESZ4,2024-01-02T14:35:00Z,100.05,100.5,97.5,98,1000,RTH',
    'ES,ESZ4,2024-01-02T14:36:00Z,98,99,97.5,99,1000,RTH',
    'ES,ESZ4,2024-01-02T14:37:00Z,99,104,98.5,103,1000,RTH',
  ].join('\n'),
};

function loadCsv(name: string): BarMessage[] {
  const path = join(fixturesDir, name);
  const source = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : FALLBACK_FIXTURES[name];
  if (!source) {
    throw new Error(`fixture ${name} missing and no fallback content provided`);
  }
  const lines = source
    .trim()
    .split(/\n/)
    .slice(1);
  return lines.map((l) => {
    const [symbol, contract, ts, open, high, low, close, volume, session] =
      l.split(',');
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
    process.env.STRATEGIES_CONFIG_PATH = configPath;
    ddbEmitted = false;
    await startStrategies();
    unsub = subscribe('suggestion', (s) => suggestions.push(s));
  });

  afterAll(async () => {
    unsub();
    await stopStrategies();
  });

  it('replays fixtures and publishes suggestions once per direction', () => {
    suggestions.length = 0;
    const a = loadCsv('session_a.csv');
    for (const b of a) publish('bars.1m', b);
    const b = loadCsv('session_b.csv');
    for (const bar of b) publish('bars.1m', bar);
    expect(suggestions.map((s) => s.meta.strategy)).toEqual([
      'OSB',
      'VWAP_FT',
      'OSB',
      'VWAP_FT',
      'APX-DDB-01',
    ]);
    expect(suggestions.map((s) => s.side)).toEqual([
      'BUY',
      'BUY',
      'SELL',
      'SELL',
      'BUY',
    ]);
  });
});
