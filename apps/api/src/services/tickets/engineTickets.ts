import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import {
  evaluateHardStop,
  type HardStopDecision,
  type HardStopInput,
} from '../../risk/hardStop.js';

export interface TicketRiskConfig {
  maxRiskDollarsPerTrade: number | null;
}

export interface MinimalTicket {
  id: string;
  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';
  contracts: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number | null;
  riskDollars: number;
  engineTimestamp: string;
  engineVersion: string;
  riskEngineVersion: string;
  strategyConfigVersion: number | null;
  reason?: string;
}

export interface TicketBuildContext {
  symbol: string;
  strategy: string;
  signals: EngineSignal[];
  risk: TicketRiskConfig;
  engineVersion: string;
  riskEngineVersion: string;
  strategyConfigVersion: number | null;
}

export interface TicketBuildResult {
  tickets: MinimalTicket[];
  rejected: {
    signal: EngineSignal;
    decision: HardStopDecision;
  }[];
}

function makeHardStopInput(
  symbol: string,
  entryPrice: number,
  stopPrice: number,
  maxRisk: number | null,
): HardStopInput {
  return {
    symbol,
    entryPrice,
    stopPrice,
    maxRiskDollarsPerTrade: maxRisk ?? 0,
    requestedContracts: undefined,
  };
}

export function buildTicketsFromSignals(ctx: TicketBuildContext): TicketBuildResult {
  const {
    symbol,
    strategy,
    signals,
    risk,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
  } = ctx;

  if (!signals.length) {
    return { tickets: [], rejected: [] };
  }

  const maxRisk = risk.maxRiskDollarsPerTrade ?? 0;
  const tickets: MinimalTicket[] = [];
  const rejected: { signal: EngineSignal; decision: HardStopDecision }[] = [];

  for (const signal of signals) {
    const entryPrice =
      typeof signal.entryPrice === 'number' && Number.isFinite(signal.entryPrice)
        ? signal.entryPrice
        : signal.price;
    const stopPrice = signal.stopPrice;

    if (!Number.isFinite(entryPrice) || !Number.isFinite(stopPrice as number)) {
      rejected.push({
        signal,
        decision: {
          approved: false,
          symbol,
          entryPrice,
          stopPrice: stopPrice as number,
          contracts: 0,
          riskDollars: 0,
          reason: 'Missing or invalid entry/stop price for ticket sizing',
        },
      });
      continue;
    }

    const input: HardStopInput = makeHardStopInput(symbol, entryPrice, stopPrice as number, maxRisk);
    const decision = evaluateHardStop(input);

    if (decision.approved && decision.contracts > 0 && decision.riskDollars > 0) {
      const id = `${strategy}-${symbol}-${signal.timestamp}`;
      tickets.push({
        id,
        symbol,
        strategy,
        direction: signal.direction,
        contracts: decision.contracts,
        entryPrice,
        stopPrice: stopPrice as number,
        targetPrice: typeof signal.targetPrice === 'number' ? signal.targetPrice : null,
        riskDollars: decision.riskDollars,
        engineTimestamp: signal.timestamp,
        engineVersion,
        riskEngineVersion,
        strategyConfigVersion,
        reason: signal.reason,
      });
    } else {
      rejected.push({ signal, decision });
    }
  }

  return { tickets, rejected };
}
