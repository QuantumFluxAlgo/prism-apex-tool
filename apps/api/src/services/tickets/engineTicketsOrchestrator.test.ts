import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { TicketBuildResult } from './engineTickets.js';
import { buildTicketsFromSignals } from './engineTickets.js';
import { persistEngineTickets } from './engineTicketsStore.js';
import { runEngineTicketsPipeline, type EngineTicketsRunContext } from './engineTicketsOrchestrator.js';

vi.mock('./engineTickets.js', () => ({
  buildTicketsFromSignals: vi.fn(),
}));

vi.mock('./engineTicketsStore.js', () => ({
  persistEngineTickets: vi.fn(async () => {}),
}));

const mockedBuild = buildTicketsFromSignals as unknown as vi.Mock;
const mockedPersist = persistEngineTickets as unknown as vi.Mock;

function makeSignal(overrides: Partial<EngineSignal> = {}): EngineSignal {
  return {
    id: 'sig-1',
    timestamp: '2025-01-15T14:30:00Z',
    direction: 'LONG',
    price: 5000,
    entryPrice: 5000,
    stopPrice: 4997.5,
    targetPrice: 5005,
    reason: 'test',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<EngineTicketsRunContext> = {}): EngineTicketsRunContext {
  return {
    symbol: 'ES',
    strategy: 'orr',
    sessionDate: '2025-01-15',
    engineVersion: '0.5.0-orr-osb-vwapft',
    riskEngineVersion: '1.0.0',
    strategyConfigVersion: 42,
    risk: { maxRiskDollarsPerTrade: 500 },
    signals: [makeSignal()],
    meta: { source: 'unit-test' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runEngineTicketsPipeline', () => {
  test('returns empty result and skips persistence when signals are empty', async () => {
    const ctx = makeCtx({ signals: [] });
    const result = await runEngineTicketsPipeline(ctx);
    expect(result.tickets).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(mockedBuild).not.toHaveBeenCalled();
    expect(mockedPersist).not.toHaveBeenCalled();
  });

  test('builds and persists tickets, returning the builder result', async () => {
    const ctx = makeCtx();
    const builderResult: TicketBuildResult = {
      tickets: [{ id: 't-1' } as any],
      rejected: [],
    };
    mockedBuild.mockReturnValueOnce(builderResult);

    const result = await runEngineTicketsPipeline(ctx);

    expect(result).toBe(builderResult);
    expect(mockedBuild).toHaveBeenCalledTimes(1);
    expect(mockedPersist).toHaveBeenCalledTimes(1);
    const persistCtx = mockedPersist.mock.calls[0][0];
    expect(persistCtx.symbol).toBe('ES');
    expect(persistCtx.strategy).toBe('orr');
    expect(persistCtx.sessionDate).toBe('2025-01-15');
    expect(persistCtx.engineVersion).toBe('0.5.0-orr-osb-vwapft');
    expect(persistCtx.riskEngineVersion).toBe('1.0.0');
    expect(persistCtx.strategyConfigVersion).toBe(42);
    expect(persistCtx.tickets).toBe(builderResult.tickets);
    expect(persistCtx.rejected).toBe(builderResult.rejected);
  });
});
