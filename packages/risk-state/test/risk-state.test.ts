import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { getState, resetIfNewDay, canAfford, addRisk } from '../src/index';

const FILE = '.state/daily-risk.json';

function clean() {
  if (existsSync(FILE)) rmSync(FILE, { force: true });
}

describe('risk-state', () => {
  beforeEach(() => clean());

  it("initializes with today's date and zero risk", () => {
    const s = getState();
    expect(s.ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.riskUsed).toBe(0);
  });

  it('adds risk and persists', () => {
    addRisk(150);
    const s = getState();
    expect(s.riskUsed).toBe(150);
  });

  it('canAfford respects cap', () => {
    addRisk(300);
    expect(canAfford(499, 800)).toBe(true);
    expect(canAfford(500, 800)).toBe(true);
    expect(canAfford(501, 800)).toBe(false);
  });

  it('resets on new day', () => {
    addRisk(200);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    resetIfNewDay(yesterday); // different date triggers reset to passed date
    const s = getState();
    expect(s.riskUsed).toBe(0);
    expect(s.ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
