import type { EngineSignal } from '../dto/strategy-engine/index.js';
import type { HardStopDecision, HardStopInput } from './hardStop.js';
import { evaluateHardStop } from './hardStop.js';

export interface EngineRiskConfig {
  maxRiskDollarsPerTrade: number | null;
}

export interface EngineSignalWithRiskDecision {
  signal: EngineSignal;
  decision: HardStopDecision;
}

export interface ApplyHardStopParams {
  symbol: string;
  signals: EngineSignal[];
  config: EngineRiskConfig;
}

export interface ApplyHardStopResult {
  approvedSignals: EngineSignal[];
  rejectedSignals: EngineSignalWithRiskDecision[];
}

function hasValidPrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function applyHardStopToSignals(params: ApplyHardStopParams): ApplyHardStopResult {
  const { symbol, signals, config } = params;
  const { maxRiskDollarsPerTrade } = config;

  if (!signals.length) {
    return { approvedSignals: [], rejectedSignals: [] };
  }

  if (!Number.isFinite(maxRiskDollarsPerTrade ?? null) || (maxRiskDollarsPerTrade ?? 0) <= 0) {
    return { approvedSignals: signals.slice(), rejectedSignals: [] };
  }

  const approvedSignals: EngineSignal[] = [];
  const rejectedSignals: EngineSignalWithRiskDecision[] = [];

  for (const signal of signals) {
    const entryPrice = hasValidPrice(signal.entryPrice) ? signal.entryPrice : signal.price;
    const stopPrice = signal.stopPrice;

    if (!hasValidPrice(entryPrice) || !hasValidPrice(stopPrice)) {
      rejectedSignals.push({
        signal,
        decision: {
          approved: false,
          symbol,
          entryPrice,
          stopPrice: stopPrice ?? Number.NaN,
          contracts: 0,
          riskDollars: 0,
          reason: 'Missing entry or stop price for hard-stop evaluation',
        },
      });
      continue;
    }

    const input: HardStopInput = {
      symbol,
      entryPrice,
      stopPrice,
      maxRiskDollarsPerTrade: maxRiskDollarsPerTrade!,
      requestedContracts: undefined,
    };

    const decision = evaluateHardStop(input);

    if (decision.approved && decision.contracts > 0 && decision.riskDollars > 0) {
      approvedSignals.push(signal);
    } else {
      rejectedSignals.push({ signal, decision });
    }
  }

  return { approvedSignals, rejectedSignals };
}
