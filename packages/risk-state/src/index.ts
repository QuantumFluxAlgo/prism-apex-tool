import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

export type RiskState = { ymd: string; riskUsed: number };
const FILE = '.state/daily-risk.json';

export function getState(): RiskState {
  try {
    if (!existsSync(FILE)) return { ymd: today(), riskUsed: 0 };
    const s = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!s || typeof s.ymd !== 'string' || typeof s.riskUsed !== 'number')
      throw new Error('bad state');
    // Auto reset if date changed
    if (s.ymd !== today()) return { ymd: today(), riskUsed: 0 };
    return s;
  } catch {
    return { ymd: today(), riskUsed: 0 };
  }
}

export function resetIfNewDay(ymd: string): void {
  const s = getState();
  if (s.ymd !== ymd) persist({ ymd, riskUsed: 0 });
}

export function canAfford(extra: number, cap: number): boolean {
  const s = getState();
  return s.riskUsed + Math.max(0, extra) <= cap;
}

export function addRisk(extra: number): void {
  const s = getState();
  const next: RiskState = { ymd: s.ymd, riskUsed: s.riskUsed + Math.max(0, extra) };
  persist(next);
}

function persist(s: RiskState): void {
  mkdirSync(dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(s), 'utf8');
  // Atomic replace
  renameSync(tmp, FILE);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
