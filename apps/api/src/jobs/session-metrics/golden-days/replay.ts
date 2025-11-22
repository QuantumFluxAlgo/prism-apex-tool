import { promises as fs } from 'fs';
import path from 'path';

type GoldenDayBar1m = {
  ts: string; // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type GoldenDayFixture = {
  symbol: string;
  sessionDate: string; // YYYY-MM-DD
  timezone: string;
  bars1m: GoldenDayBar1m[];
  expectedSessionMetrics?: Record<string, unknown>;
};

export type GoldenDayReplayResult = {
  fixture: GoldenDayFixture;
  recomputedSessionMetrics: unknown;
  expectedSessionMetrics?: Record<string, unknown>;
};

export type SessionMetricsService = {
  getForSymbolSession(symbol: string, sessionDate: string): Promise<unknown>;
};

const FIXTURE_DIR = __dirname;

function resolveFixturePathByName(name: string): string {
  return path.join(FIXTURE_DIR, `${name}.json`);
}

function resolveFixturePathForSession(symbol: string, sessionDate: string): string {
  return resolveFixturePathByName(`${symbol}_${sessionDate}`);
}

async function readFixtureFile(filePath: string): Promise<GoldenDayFixture> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Golden Day fixture not found at ${filePath}: ${String(error)}`);
  }

  try {
    const parsed = JSON.parse(raw) as GoldenDayFixture;
    if (!parsed.symbol || !parsed.sessionDate || !Array.isArray(parsed.bars1m)) {
      throw new Error('fixture missing required fields (symbol, sessionDate, bars1m)');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse Golden Day fixture at ${filePath}: ${String(error)}`);
  }
}

export async function loadGoldenDayFixtureByName(name: string): Promise<GoldenDayFixture> {
  const filePath = resolveFixturePathByName(name);
  return readFixtureFile(filePath);
}

export async function loadGoldenDayFixtureForSession(symbol: string, sessionDate: string) {
  const filePath = resolveFixturePathForSession(symbol, sessionDate);
  return readFixtureFile(filePath);
}

export async function replayGoldenDayWithService(
  fixture: GoldenDayFixture,
  service: SessionMetricsService,
): Promise<GoldenDayReplayResult> {
  const recomputedSessionMetrics = await service.getForSymbolSession(
    fixture.symbol,
    fixture.sessionDate,
  );

  return {
    fixture,
    recomputedSessionMetrics,
    expectedSessionMetrics: fixture.expectedSessionMetrics,
  };
}
