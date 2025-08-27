import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type StrategyKey = 'vwap-first-touch' | 'opening-session-breakout';

export type VwapFirstTouchParams = {
  slopeLookback: number;
  minDistanceATR: number;
  stopKATR: number;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  minStopTicks: number;
  warmupBars: number;
  maxTouchKATR: number;
  entryOffsetTicks: number;
};

export type OpeningSessionBreakoutParams = {
  orMinutes: number;
  requireCloseBreak: boolean;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  widthMinTicks: number;
  widthMinATR: number;
  widthMaxATR: number;
  minRiskTicks: number;
  entryOffsetTicks: number;
  stopOffsetTicks: number;
  postOrBars: number;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadStrategyConfig<T>(key: StrategyKey): T {
  const filePath = join(__dirname, '../../../../configs/strategies', `${key}.json`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Failed to load strategy config for ${key}: ${(err as Error).message}`);
  }
}

export function mergeParams<T>(defaults: T, overrides?: Partial<T>): T {
  return { ...defaults, ...(overrides ?? {}) };
}
