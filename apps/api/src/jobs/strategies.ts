import { publish, subscribe } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';
import {
  initialVwapState,
  updateVwap,
  atrWilderSeries,
  swings,
  type VwapState,
} from '@prism-apex/indicators';
import {
  vwapFirstTouch,
  openingSwingBreakout,
  type Suggestion as StratSuggestion,
} from '@prism-apex/strategies';
import { planLongOnlyRetest } from '@prism-apex/strategy-apx-ddb01';
import { trackEvent } from '@prism-apex/analytics';
import fs from 'fs';
import path from 'path';
import { TICKET_STRATEGIES } from '../schemas/ticket.js';
import type { TicketStrategy } from '../schemas/ticket.js';

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
    weeklyVwap?: number;
    priorHigh?: number;
    stopTicks?: number;
    bufferTicks?: number;
  };
};

interface DebounceState {
  vwapActive: boolean;
  osbLong: boolean;
  osbShort: boolean;
  ddbLong: boolean;
}

interface Ddb01State {
  weekKey: string;
  cumulativeTPV: number;
  cumulativeVolume: number;
  weeklyVwap: number;
  priorRthHigh?: number;
  currentRthHigh?: number;
  lastSuggestionSession?: string;
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
  ddb01: Ddb01State;
}

const TICK_SPECS: Record<string, { tickSize: number }> = {
  ES: { tickSize: 0.25 },
  NQ: { tickSize: 0.25 },
  MES: { tickSize: 0.25 },
  MNQ: { tickSize: 0.25 },
};

const MAX_BARS = 300;

const makeStrategyCounter = (): Record<TicketStrategy, number> =>
  Object.fromEntries(TICKET_STRATEGIES.map((strategy) => [strategy, 0])) as Record<
    TicketStrategy,
    number
  >;

export const strategies = {
  running: false,
  lastBarTs: '',
  lastSuggestionTs: '',
  counts: makeStrategyCounter(),
};

interface Ddb01Config {
  enabled?: boolean;
  bufferTicks?: number;
  minStopTicks?: number | Record<string, number>;
  rr?: number;
  guardrails?: string[];
  sizingHintPctOfMax?: number;
}

interface Config {
  VWAP_FT: Record<string, any>;
  OSB: Record<string, any>;
  'APX-DDB-01': Ddb01Config;
}

let cfg: Config = { VWAP_FT: {}, OSB: {}, 'APX-DDB-01': {} };

function loadConfig(): Config {
  const defaultPath =
    process.env.STRATEGIES_CONFIG_PATH ||
    path.join(process.cwd(), 'configs/strategies.default.json');
  const p = fs.existsSync(defaultPath)
    ? defaultPath
    : path.join(process.cwd(), '../../configs/strategies.default.json');
  const txt = fs.readFileSync(p, 'utf8');
  const parsed = JSON.parse(txt) as Partial<Config>;
  return {
    VWAP_FT: parsed?.VWAP_FT ?? {},
    OSB: parsed?.OSB ?? {},
    'APX-DDB-01': parsed?.['APX-DDB-01'] ?? {},
  };
}

let unsub: (() => void) | null = null;
const state = new Map<string, ContractState>();

function sessionKey(ts: string): string {
  return ts.slice(0, 10);
}

function weekKey(ts: string): string {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // 0 -> Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
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
  const wkey = weekKey(bar.ts);
  if (!cs || cs.sessionKey !== skey) {
    const prevDdb = cs?.ddb01;
    const sameWeek = prevDdb?.weekKey === wkey;
    cs = {
      sessionKey: skey,
      bars: [],
      vwapState: initialVwapState(),
      vwapSeries: [],
      atrSeries: [],
      debounce: { vwapActive: false, osbLong: false, osbShort: false, ddbLong: false },
      orHigh: undefined,
      orLow: undefined,
      ddb01: {
        weekKey: wkey,
        cumulativeTPV: sameWeek && prevDdb ? prevDdb.cumulativeTPV : 0,
        cumulativeVolume: sameWeek && prevDdb ? prevDdb.cumulativeVolume : 0,
        weeklyVwap: sameWeek && prevDdb ? prevDdb.weeklyVwap : NaN,
        priorRthHigh:
          typeof prevDdb?.currentRthHigh === 'number' && Number.isFinite(prevDdb.currentRthHigh)
            ? prevDdb.currentRthHigh
            : undefined,
        currentRthHigh: undefined,
        lastSuggestionSession: undefined,
      },
    };
    state.set(key, cs);
  }

  cs.bars.push(bar);
  if (cs.bars.length > MAX_BARS) cs.bars.shift();

  const { state: newVState, vwap } = updateVwap(cs.vwapState, bar, skey);
  cs.vwapState = newVState;
  cs.vwapSeries.push(vwap);
  if (cs.vwapSeries.length > MAX_BARS) cs.vwapSeries.shift();

  // Ensure downstream consumers always get number[]
  cs.atrSeries = atrWilderSeries(cs.bars as any, 14).map((v) => v ?? 0);
  const atr = cs.atrSeries[cs.atrSeries.length - 1] ?? 0;
  const atrTicks = atr / tick.tickSize;

  if (cs.bars.length === (cfg.OSB.orMinutes ?? 5)) {
    const orWindow = cs.bars.slice(0, cfg.OSB.orMinutes ?? 5);
    cs.orHigh = Math.max(...orWindow.map((b) => b.high));
    cs.orLow = Math.min(...orWindow.map((b) => b.low));
  }

  updateDdbState(cs, bar, wkey);
  maybeEmitDdbSuggestion(bar, cs, tick, cfg['APX-DDB-01']);

  swings(cs.bars as any, 3); // computed for side-effects (debug)

  if (cs.bars.length <= 5) return; // ignore first 5 mins

  // VWAP First Touch
  if (cs.vwapSeries.length > 0) {
    if (cs.debounce.vwapActive) {
      if (Math.abs(bar.close - vwap) >= 0.5 * atr) {
        cs.debounce.vwapActive = false;
      }
    } else {
      const res = vwapFirstTouch(
        bar.symbol,
        cs.bars as any,
        cs.vwapSeries,
        cs.atrSeries,
        tick,
        cfg.VWAP_FT,
      );
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

function updateDdbState(cs: ContractState, bar: BarMessage, currentWeekKey: string): void {
  if (cs.ddb01.weekKey !== currentWeekKey) {
    cs.ddb01.weekKey = currentWeekKey;
    cs.ddb01.cumulativeTPV = 0;
    cs.ddb01.cumulativeVolume = 0;
    cs.ddb01.weeklyVwap = NaN;
  }

  const vol = Number.isFinite(bar.volume) ? Math.max(0, bar.volume) : 0;
  if (vol > 0) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cs.ddb01.cumulativeTPV += typicalPrice * vol;
    cs.ddb01.cumulativeVolume += vol;
    cs.ddb01.weeklyVwap = cs.ddb01.cumulativeTPV / cs.ddb01.cumulativeVolume;
  }

  const currentHigh = cs.ddb01.currentRthHigh ?? -Infinity;
  cs.ddb01.currentRthHigh = Math.max(currentHigh, bar.high);
}

function maybeEmitDdbSuggestion(
  bar: BarMessage,
  cs: ContractState,
  tick: { tickSize: number },
  config: Ddb01Config,
): void {
  if (config.enabled === false) return;
  if (cs.debounce.ddbLong) return;
  if (cs.ddb01.lastSuggestionSession === cs.sessionKey) return;

  const priorHigh = cs.ddb01.priorRthHigh;
  const weeklyVwap = cs.ddb01.weeklyVwap;
  if (typeof priorHigh !== 'number' || !Number.isFinite(priorHigh) || priorHigh <= 0) return;
  if (!Number.isFinite(weeklyVwap)) return;

  const bufferTicks = config.bufferTicks ?? 2;
  const minStopTicks = resolveMinStopTicks(config, bar.symbol, Math.max(bufferTicks, 12));
  const plan = planLongOnlyRetest({
    tickSize: tick.tickSize,
    currentPrice: bar.close,
    weeklyVwap,
    priorHigh,
    bufferTicks,
    minStopTicks,
    rr: config.rr,
  });
  if (!plan) return;

  const stopTicks = plan.stopTicks;
  if (!(stopTicks > 0)) return;
  const targetTicks = Math.max(1, Math.round(plan.rr * stopTicks));
  const entry = roundToTick(plan.entry, tick.tickSize);
  const stop = roundPrice(entry - stopTicks * tick.tickSize);
  const target = roundPrice(entry + targetTicks * tick.tickSize);

  const meta: Suggestion['meta'] = {
    strategy: 'APX-DDB-01',
    rr: plan.rr,
    notes: plan.notes,
    weeklyVwap,
    priorHigh,
    stopTicks,
    bufferTicks,
  };
  if (Array.isArray(config.guardrails) && config.guardrails.length > 0) {
    meta.guardrails = config.guardrails;
  }
  if (typeof config.sizingHintPctOfMax === 'number') {
    meta.sizingHintPctOfMax = config.sizingHintPctOfMax;
  }

  const suggestion: Suggestion = {
    symbol: bar.symbol,
    contract: bar.contract,
    side: 'BUY',
    entry,
    stop,
    target,
    timestampUtc: bar.ts,
    meta,
  };

  cs.debounce.ddbLong = true;
  cs.ddb01.lastSuggestionSession = cs.sessionKey;
  emitSuggestion(suggestion);
}

function resolveMinStopTicks(config: Ddb01Config, symbol: string, fallback: number): number {
  const { minStopTicks } = config;
  if (typeof minStopTicks === 'number') return minStopTicks;
  if (minStopTicks && typeof minStopTicks[symbol] === 'number') {
    return minStopTicks[symbol] as number;
  }
  return fallback;
}

function roundToTick(price: number, tickSize: number): number {
  if (tickSize <= 0) return price;
  return Number((Math.round(price / tickSize) * tickSize).toFixed(10));
}

function roundPrice(price: number): number {
  return Number(price.toFixed(10));
}

function emitSuggestion(s: Suggestion): void {
  strategies.lastSuggestionTs = s.timestampUtc;
  const strategy: TicketStrategy = s.meta.strategy;
  strategies.counts[strategy] += 1;
  publish<Suggestion>('suggestion', s);
  trackEvent('strategies.suggestion', { strategy: s.meta.strategy, contract: s.contract });
}

export function registerStrategiesJob(): void {
  jobManager.register('STRATEGIES', start, stop);
}

export const startStrategies = start;
export const stopStrategies = stop;
