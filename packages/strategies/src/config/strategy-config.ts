import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

let moduleDirname: string;

if (typeof __dirname === 'string') {
  moduleDirname = __dirname;
} else {
  const moduleUrl = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
  moduleDirname = moduleUrl ? dirname(fileURLToPath(moduleUrl)) : process.cwd();
}

export function loadStrategyConfig<T>(key: StrategyKey): T {
  const filePath = join(
    moduleDirname,
    '..',
    '..',
    '..',
    '..',
    'configs',
    'strategies',
    `${key}.json`,
  );
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
