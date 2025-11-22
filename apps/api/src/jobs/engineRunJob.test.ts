import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EngineSignal } from '../dto/strategy-engine/index.js';
import { runEngineSessionJob } from './engineRunJob.js';

vi.mock('../services/strategy-engine/index.js', () => ({
  runEnginePreview: vi.fn(),
}));

vi.mock('../services/tickets/engineTicketsOrchestrator.js', () => ({
  runEngineTicketsPipeline: vi.fn(),
}));

vi.mock('../services/governance/alert.js', () => ({
  logGovernanceAlert: vi.fn(),
}));

import { runEnginePreview } from '../services/strategy-engine/index.js';
import { runEngineTicketsPipeline } from '../services/tickets/engineTicketsOrchestrator.js';
import { logGovernanceAlert } from '../services/governance/alert.js';

const mockedRunEnginePreview = runEnginePreview as unknown as vi.Mock;
const mockedRunEngineTicketsPipeline = runEngineTicketsPipeline as unknown as vi.Mock;
const mockedLogGovernanceAlert = logGovernanceAlert as unknown as vi.Mock;

function makeSignal(overrides: Partial<EngineSignal> = {}): EngineSignal {
  return {
    id: 'sig-1',
    timestamp: '2025-01-15T14:30:00Z',
    direction: 'LONG',
    price: 5000,
    entryPrice: 5000,
    stopPrice: 4997.5,
    targetPrice: 5005,
    reason: 'test-signal',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE;
});

describe('runEngineSessionJob', () => {
  test('skips tickets pipeline when preview returns no signals', async () => {
    mockedRunEnginePreview.mockResolvedValueOnce({
      signals: [],
      meta: {
        engineVersion: '1.0.0-test',
        riskEngineVersion: '2.0.0-risk',
        strategyConfigVersion: 10,
        safetyEnvelopeDropped: 3,
      },
    });

    const summary = await runEngineSessionJob({
      strategy: 'orr',
      symbol: 'ES',
      sessionDate: '2025-01-15',
    });

    expect(mockedRunEngineTicketsPipeline).not.toHaveBeenCalled();
    expect(summary.signals).toBe(0);
    expect(mockedLogGovernanceAlert).toHaveBeenCalledWith(
      'engine_run_summary',
      expect.objectContaining({
        strategy: 'orr',
        signals: 0,
      }),
    );
  });

  test('uses override risk cap and calls tickets pipeline for non-empty signals', async () => {
    const signals = [makeSignal()];
    mockedRunEnginePreview.mockResolvedValueOnce({
      signals,
      meta: {
        engineVersion: '1.2.3-override',
        riskEngineVersion: '2.0.0-risk',
        strategyConfigVersion: 99,
        safetyEnvelopeDropped: 0,
      },
    });
    mockedRunEngineTicketsPipeline.mockResolvedValueOnce({
      tickets: [{ contracts: 1 }],
      rejected: [],
    });

    const summary = await runEngineSessionJob({
      strategy: 'osb',
      symbol: 'NQ',
      sessionDate: '2025-01-16',
      maxRiskDollarsPerTrade: 750,
      meta: { jobId: 'xyz' },
    });

    expect(mockedRunEngineTicketsPipeline).toHaveBeenCalledTimes(1);
    const ctx = mockedRunEngineTicketsPipeline.mock.calls[0][0];
    expect(ctx.symbol).toBe('NQ');
    expect(ctx.strategy).toBe('osb');
    expect(ctx.sessionDate).toBe('2025-01-16');
    expect(ctx.engineVersion).toBe('1.2.3-override');
    expect(ctx.risk.maxRiskDollarsPerTrade).toBe(750);
    expect(ctx.signals).toEqual(signals);
    expect(ctx.riskEngineVersion).toBe('2.0.0-risk');
    expect(ctx.strategyConfigVersion).toBe(99);
    expect(ctx.meta).toMatchObject({
      source: 'engineSessionJob',
      jobId: 'xyz',
      safetyEnvelopeDropped: 0,
    });
    expect(summary.tickets).toBe(1);
    expect(summary.hardStopRejected).toBe(0);
  });

  test('falls back to env risk cap when override absent', async () => {
    process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE = '250';
    const signals = [makeSignal()];
    mockedRunEnginePreview.mockResolvedValueOnce({
      signals,
      meta: {
        engineVersion: 'env-2.0.0',
        riskEngineVersion: '2.0.0-risk',
        strategyConfigVersion: 5,
        safetyEnvelopeDropped: 1,
      },
    });
    mockedRunEngineTicketsPipeline.mockResolvedValueOnce({
      tickets: [],
      rejected: [],
    });

    const summary = await runEngineSessionJob({
      strategy: 'vwapft',
      symbol: 'ES',
      sessionDate: '2025-02-01',
    });

    expect(mockedRunEngineTicketsPipeline).toHaveBeenCalledTimes(1);
    const ctx = mockedRunEngineTicketsPipeline.mock.calls[0][0];
    expect(ctx.risk.maxRiskDollarsPerTrade).toBe(250);
    expect(summary.riskCap).toBe(250);
  });

  test('logs safety envelope drop counts when preview rejects signals', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockedRunEnginePreview.mockResolvedValueOnce({
      signals: [],
      meta: {
        engineVersion: '1.0.0-test',
        riskEngineVersion: '2.0.0-risk',
        strategyConfigVersion: 11,
        safetyEnvelopeDropped: 7,
      },
    });

    await runEngineSessionJob({
      strategy: 'orr',
      symbol: 'ES',
      sessionDate: '2025-03-01',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.safetyEnvelopeDropped).toBe(7);
    logSpy.mockRestore();
  });

  test('emits hard stop governance alert when tickets are rejected', async () => {
    mockedRunEnginePreview.mockResolvedValueOnce({
      signals: [makeSignal()],
      meta: {
        engineVersion: '1.0.0-test',
        riskEngineVersion: '2.0.0-risk',
        strategyConfigVersion: 42,
        safetyEnvelopeDropped: 1,
      },
    });
    mockedRunEngineTicketsPipeline.mockResolvedValueOnce({
      tickets: [],
      rejected: [{ decision: { approved: false }, signal: makeSignal() }],
    });

    const result = await runEngineSessionJob({
      strategy: 'orr',
      symbol: 'ES',
      sessionDate: '2025-01-20',
    });

    expect(result.hardStopRejected).toBe(1);
    expect(mockedLogGovernanceAlert).toHaveBeenCalledWith(
      'hard_stop_drops',
      expect.objectContaining({
        strategy: 'orr',
        rejectedCount: 1,
      }),
    );
  });
});
