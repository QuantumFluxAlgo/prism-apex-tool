import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runEngineReplayJob } from './engineReplayRunner.js';

vi.mock('./engineRunJob.js', () => ({
  runEngineSessionJob: vi.fn(),
}));

vi.mock('../services/governance/alert.js', () => ({
  logGovernanceAlert: vi.fn(),
}));

import { runEngineSessionJob } from './engineRunJob.js';
import { logGovernanceAlert } from '../services/governance/alert.js';

const mockedRunEngineSessionJob = runEngineSessionJob as unknown as vi.Mock;
const mockedLogGovernanceAlert = logGovernanceAlert as unknown as vi.Mock;

function makeRunResult(overrides: Partial<ReturnType<typeof baseResult>> = {}) {
  return { ...baseResult(), ...overrides };
}

function baseResult() {
  return {
    strategy: 'orr',
    symbol: 'ES',
    sessionDate: '2025-01-15',
    engineVersion: '1.0.0',
    riskEngineVersion: '2.0.0-risk',
    strategyConfigVersion: 10,
    riskCap: 500,
    signals: 1,
    tickets: 1,
    rejected: 0,
    hardStopRejected: 0,
    safetyEnvelopeDropped: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runEngineReplayJob', () => {
  test('handles empty inputs without running engine jobs', async () => {
    const summary = await runEngineReplayJob({
      strategies: [],
      symbols: [],
      sessionDates: [],
    });

    expect(summary.totalSessions).toBe(0);
    expect(summary.attempted).toBe(0);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.failures.length).toBe(0);
    expect(mockedRunEngineSessionJob).not.toHaveBeenCalled();
  });

  test('runs all combinations and counts successes', async () => {
    mockedRunEngineSessionJob.mockResolvedValue(makeRunResult());

    const summary = await runEngineReplayJob({
      strategies: ['orr'],
      symbols: ['ES', 'NQ'],
      sessionDates: ['2025-01-15', '2025-01-16'],
      maxRiskDollarsPerTrade: 500,
      meta: { tag: 'test-run' },
    });

    expect(summary.totalSessions).toBe(4);
    expect(summary.attempted).toBe(4);
    expect(summary.succeeded).toBe(4);
    expect(summary.failed).toBe(0);
    expect(summary.failures.length).toBe(0);
    expect(mockedRunEngineSessionJob).toHaveBeenCalledTimes(4);
  });

  test('logs failures when an engine job throws', async () => {
    const sequence: Array<() => Promise<ReturnType<typeof baseResult>>> = [
      async () => makeRunResult(),
      async () => {
        throw new Error('engine failure');
      },
      async () => makeRunResult({ safetyEnvelopeDropped: 1 }),
      async () => makeRunResult({ hardStopRejected: 2 }),
    ];

    mockedRunEngineSessionJob.mockImplementation(() => {
      const fn = sequence.shift();
      return fn ? fn() : Promise.resolve(makeRunResult());
    });

    const summary = await runEngineReplayJob({
      strategies: ['orr'],
      symbols: ['ES', 'NQ'],
      sessionDates: ['2025-01-15', '2025-01-16'],
    });

    expect(summary.totalSessions).toBe(4);
    expect(summary.attempted).toBe(4);
    expect(summary.succeeded).toBe(3);
    expect(summary.failed).toBe(1);
    expect(summary.failures).toHaveLength(1);
    expect(summary.failures[0].error).toContain('engine failure');
    expect(summary.totalSafetyEnvelopeDropped).toBe(1);
    expect(summary.totalHardStopRejected).toBe(2);
    expect(mockedLogGovernanceAlert).toHaveBeenCalledWith(
      'replay_safety_summary',
      expect.objectContaining({
        totalSafetyEnvelopeDropped: 1,
        totalHardStopRejected: 2,
      }),
    );
  });
});
