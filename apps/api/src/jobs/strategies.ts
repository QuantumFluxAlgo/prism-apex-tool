import { publish, subscribe } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';
import {
  initialVwapState,
  updateVwap,
  atrWilderSeries,
  swings,
  type VwapState,
} from '@prism-apex-tool/indicators';
import {
  vwapFirstTouch,
  openingSwingBreakout,
  type Suggestion as StratSuggestion,
} from '@prism-apex-tool/strategies';
import { trackEvent } from '@prism-apex-tool/analytics';
import fs from 'fs';
import path from 'path';

export interface BarMessage {
  symbol: string; // root e.g., ES
  contract: string; // full contract e.g., ESZ4
  ts: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session: 'RTH' | 'ETH';
}

export type Suggestion = StratSuggestion & {
  contract: string;
  meta: StratSuggestion['meta'] & {
    vwap?: number;
    atrTicks?: number;
    orHigh?: number;
    orLow?: number;
  };
};

interface DebounceState {
  vwapActive: boolean;
  osbLong: boolean;
  osbShort: boolean;
}

interface ContractState {
  sessionKey: string;
  bars: BarMessage[];
  vwapState: VwapState;
  vwapSeries: number[];
  atrSeries: number[];
  debounce: DebounceState;
  orHigh?: number;
  orLow?: number;
}

const TICK_SPECS: Record<string, { tickSize: number }> = {
  ES: { tickSize: 0.25 },
  NQ: { tickSize: 0.25 },
  MES: { tickSize: 0.25 },
  MNQ: { tickSize: 0.25 },
};

const MAX_BARS = 300;

export const strategies = {
  running: false,
  lastBarTs: '',
  lastSuggestionTs: '',
  counts: { VWAP_FT: 0, OSB: 0 },
};

interface Config {
  VWAP_FT: Record<string, any>;
  OSB: Record<string, any>;
}

let cfg: Config = { VWAP_FT: {}, OSB: {} };

function loadConfig(): Config {
  const defaultPath = process.env.STRATEGIES_CONFIG_PATH || path.join(process.cwd(), 'configs/strategies.default.json');
  const p = fs.existsSync(defaultPath)
    ? defaultPath
    : path.join(process.cwd(), '../../configs/strategies.default.json');
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

let unsub: (() => void) | null = null;
const state = new Map<string, ContractState>();

function sessionKey(ts: string): string {
  return ts.slice(0, 10);
}

async function start(): Promise<void> {
  cfg = loadConfig();
  strategies.running = true;
  unsub = subscribe<BarMessage>('bars.1m', onBar);
}

async function stop(): Promise<void> {
  unsub?.();
  state.clear();
  strategies.running = false;
}

function onBar(bar: BarMessage): void {
  jobManager.beat('STRATEGIES');
  strategies.lastBarTs = bar.ts;
  if (bar.session !== 'RTH') return;
  const tick = TICK_SPECS[bar.symbol];
  if (!tick) return;

  const key = `${bar.contract}`;
  let cs = state.get(key);
  const skey = sessionKey(bar.ts);
  if (!cs || cs.sessionKey !== skey) {
    cs = {
      sessionKey: skey,
      bars: [],
      vwapState: initialVwapState(),
      vwapSeries: [],
      atrSeries: [],
      debounce: { vwapActive: false, osbLong: false, osbShort: false },
      orHigh: undefined,
      orLow: undefined,
    };
    state.set(key, cs);
  }

  cs.bars.push(bar);
  if (cs.bars.length > MAX_BARS) cs.bars.shift();

  const { state: newVState, vwap } = updateVwap(cs.vwapState, bar, skey);
  cs.vwapState = newVState;
  cs.vwapSeries.push(vwap);
  if (cs.vwapSeries.length > MAX_BARS) cs.vwapSeries.shift();

  // atrWilderSeries returns (number|null)[] — normalize for strict consumers
  cs.atrSeries = (atrWilderSeries(cs.bars as any, 14) as Array<number | null>).map((v) => v ?? 0);
  const atr = cs.atrSeries[cs.atrSeries.length - 1] ?? 0;
  const atrTicks = atr / tick.tickSize;

  if (cs.bars.length === (cfg.OSB.orMinutes ?? 5)) {
    const orWindow = cs.bars.slice(0, cfg.OSB.orMinutes ?? 5);
    cs.orHigh = Math.max(...orWindow.map((b) => b.high));
    cs.orLow = Math.min(...orWindow.map((b) => b.low));
  }

  swings(cs.bars as any, 3); // computed for side-effects (debug)

  if (cs.bars.length <= 5) return; // ignore first 5 mins

  // VWAP First Touch
  if (cs.vwapSeries.length > 0) {
    if (cs.debounce.vwapActive) {
      if (Math.abs(bar.close - vwap) >= 0.5 * atr) {
        cs.debounce.vwapActive = false;
      }
    } else {
      const res = vwapFirstTouch(bar.symbol, cs.bars as any, cs.vwapSeries, cs.atrSeries, tick, cfg.VWAP_FT);
      if (res.length > 0) {
        cs.debounce.vwapActive = true;
        emitSuggestion({
          ...res[0],
          contract: bar.contract,
          meta: { ...res[0].meta, vwap, atrTicks },
        });
      }
    }
  }

  // OSB
  if (cs.orHigh !== undefined && cs.orLow !== undefined) {
    const res = openingSwingBreakout(bar.symbol, cs.bars as any, cs.atrSeries, tick, cfg.OSB);
    if (res.length > 0) {
      const s = res[0];
      if (s.side === 'BUY' && !cs.debounce.osbLong) {
        cs.debounce.osbLong = true;
        emitSuggestion({
          ...s,
          contract: bar.contract,
          meta: { ...s.meta, atrTicks, orHigh: cs.orHigh, orLow: cs.orLow },
        });
      } else if (s.side === 'SELL' && !cs.debounce.osbShort) {
        cs.debounce.osbShort = true;
        emitSuggestion({
          ...s,
          contract: bar.contract,
          meta: { ...s.meta, atrTicks, orHigh: cs.orHigh, orLow: cs.orLow },
        });
      }
    }
  }
}

function emitSuggestion(s: Suggestion): void {
  strategies.lastSuggestionTs = s.timestampUtc;
  strategies.counts[s.meta.strategy as 'VWAP_FT' | 'OSB']++;
  publish<Suggestion>('suggestion', s);
  trackEvent('strategies.suggestion', { strategy: s.meta.strategy, contract: s.contract });
}

export function registerStrategiesJob(): void {
  jobManager.register('STRATEGIES', start, stop);
}

export const startStrategies = start;
export const stopStrategies = stop;

