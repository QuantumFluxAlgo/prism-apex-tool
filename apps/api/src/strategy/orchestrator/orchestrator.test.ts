import { describe, it, expect } from 'vitest';
import {
  createStrategyOrchestrator,
  type OrchestratorContext,
  type StrategyId,
  type BasicSignalKind,
  type BasicEngine,
} from './orchestrator';

describe('Strategy Orchestrator multi-strategy rules', () => {
  const ctx = (overrides: Partial<OrchestratorContext> = {}): OrchestratorContext => ({
    symbol: 'ES',
    sessionDateUtc: '2025-01-15',
    inOpeningRange: false,
    ...overrides,
  });

  const engine = (id: StrategyId, output: BasicSignalKind | ((c: OrchestratorContext) => BasicSignalKind)): BasicEngine => ({
    id,
    evaluate: (c) => (typeof output === 'function' ? output(c) : output),
  });

  const makeOrchestrator = (
    orr: BasicSignalKind,
    vwap: BasicSignalKind,
    osb: BasicSignalKind,
  ) =>
    createStrategyOrchestrator({
      orr: engine('ORR_V3', orr),
      vwapFt: engine('VWAP_FT', vwap),
      osb: engine('OSB', osb),
    });

  it('gives ORR priority in OR window when ORR wants to trade', () => {
    const orchestrator = makeOrchestrator('LONG', 'SHORT', 'LONG');
    const decision = orchestrator.run(ctx({ inOpeningRange: true }));
    expect(decision.primary).toMatchObject({ id: 'ORR_V3', kind: 'LONG', reason: 'orr-priority-in-or-window' });
  });

  it('falls back to VWAP/OSB outside OR when ORR is NO_TRADE', () => {
    const orchestrator = makeOrchestrator('NO_TRADE', 'LONG', 'NO_TRADE');
    const decision = orchestrator.run(ctx({ inOpeningRange: false }));
    expect(decision.primary).toMatchObject({ id: 'VWAP_FT', kind: 'LONG' });
  });

  it('returns NO_TRADE when no strategy wants to trade', () => {
    const orchestrator = makeOrchestrator('NO_TRADE', 'NO_TRADE', 'NO_TRADE');
    const decision = orchestrator.run(ctx());
    expect(decision.primary).toMatchObject({ id: 'ORR_V3', kind: 'NO_TRADE', reason: 'no-strategy-setup' });
  });

  it('returns NO_TRADE on conflicting VWAP/OSB signals', () => {
    const orchestrator = makeOrchestrator('NO_TRADE', 'LONG', 'SHORT');
    const decision = orchestrator.run(ctx());
    expect(decision.primary).toMatchObject({ id: 'ORR_V3', kind: 'NO_TRADE', reason: 'conflict-between-strategies' });
  });

  it('prefers VWAP FT when VWAP/OSB agree outside OR', () => {
    const orchestrator = makeOrchestrator('NO_TRADE', 'SHORT', 'SHORT');
    const decision = orchestrator.run(ctx());
    expect(decision.primary).toMatchObject({ id: 'VWAP_FT', kind: 'SHORT', reason: 'vwap-ft-preferred-when-aligned' });
  });

  it('still honors ORR priority in OR window even if VWAP/OSB disagree', () => {
    const orchestrator = makeOrchestrator('SHORT', 'LONG', 'SHORT');
    const decision = orchestrator.run(ctx({ inOpeningRange: true }));
    expect(decision.primary).toMatchObject({ id: 'ORR_V3', kind: 'SHORT', reason: 'orr-priority-in-or-window' });
  });
});
