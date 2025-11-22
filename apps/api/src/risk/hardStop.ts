import {
  ContractMathError,
  getInstrumentSpec,
  dollarsToContracts,
  computeTradeRisk,
} from './contractMath.js';

export interface HardStopInput {
  symbol: string;
  entryPrice: number;
  stopPrice: number;
  maxRiskDollarsPerTrade: number;
  requestedContracts?: number | null;
}

export interface HardStopDecision {
  approved: boolean;
  symbol: string;
  entryPrice: number;
  stopPrice: number;
  contracts: number;
  riskDollars: number;
  reason?: string;
}

function rejectDecision(input: HardStopInput, reason: string): HardStopDecision {
  return {
    approved: false,
    symbol: input.symbol,
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    contracts: 0,
    riskDollars: 0,
    reason,
  };
}

export function evaluateHardStop(input: HardStopInput): HardStopDecision {
  const { symbol, entryPrice, stopPrice, maxRiskDollarsPerTrade, requestedContracts } = input;

  if (!Number.isFinite(entryPrice) || !Number.isFinite(stopPrice)) {
    return rejectDecision(input, 'entryPrice and stopPrice must be finite numbers');
  }
  if (!Number.isFinite(maxRiskDollarsPerTrade) || maxRiskDollarsPerTrade <= 0) {
    return rejectDecision(input, 'maxRiskDollarsPerTrade must be > 0');
  }

  try {
    const spec = getInstrumentSpec(symbol);
    const stopDistanceTicks = Math.abs(entryPrice - stopPrice) / spec.tickSize;

    if (!Number.isFinite(stopDistanceTicks) || stopDistanceTicks <= 0) {
      return rejectDecision(input, 'Invalid stop distance');
    }

    if (Number.isFinite(requestedContracts) && (requestedContracts ?? 0) > 0) {
      const contracts = Number(requestedContracts);
      const riskDollars = computeTradeRisk(symbol, contracts, stopDistanceTicks);

      if (riskDollars > maxRiskDollarsPerTrade) {
        return rejectDecision(
          input,
          `Requested contracts exceed per-trade risk limit (risk=${riskDollars.toFixed(
            2,
          )}, max=${maxRiskDollarsPerTrade.toFixed(2)})`,
        );
      }

      return {
        approved: true,
        symbol,
        entryPrice,
        stopPrice,
        contracts,
        riskDollars,
      };
    }

    const contracts = dollarsToContracts(symbol, maxRiskDollarsPerTrade, stopDistanceTicks);

    if (!Number.isFinite(contracts) || contracts <= 0) {
      return rejectDecision(
        input,
        'Unable to size even a single contract within per-trade risk limit',
      );
    }

    const riskDollars = computeTradeRisk(symbol, contracts, stopDistanceTicks);

    if (!Number.isFinite(riskDollars) || riskDollars <= 0) {
      return rejectDecision(input, 'Computed risk is invalid');
    }

    if (riskDollars > maxRiskDollarsPerTrade) {
      return rejectDecision(
        input,
        `Computed size breaches per-trade risk limit (risk=${riskDollars.toFixed(
          2,
        )}, max=${maxRiskDollarsPerTrade.toFixed(2)})`,
      );
    }

    return {
      approved: true,
      symbol,
      entryPrice,
      stopPrice,
      contracts,
      riskDollars,
    };
  } catch (error) {
    if (error instanceof ContractMathError) {
      return rejectDecision(input, error.message);
    }
    return rejectDecision(input, 'Unexpected error in hard-stop evaluation');
  }
}
