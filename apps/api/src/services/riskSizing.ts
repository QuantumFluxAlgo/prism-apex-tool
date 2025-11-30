export type RiskSizingInput = {
  snapshot: {
    dailyStartingBalance: number | null;
    maxDailyDrawdownPct: number | null;
    maxDailyLossAmount: number | null;
    realisedPnL: number;
    openRisk: number;
    remainingRiskCapacity: number | null;
  };
  perContractRisk: number;
  minContracts?: number;
  maxContractsCap?: number;
  riskFractionPerTrade?: number;
};

export type RiskSizingResult = {
  effectiveCapacity: number | null;
  suggestedRiskAmount: number | null;
  suggestedContracts: number;
  reason: 'NO_CONFIG' | 'LOCKED_OUT' | 'INVALID_PER_CONTRACT_RISK' | 'CAPACITY_TOO_SMALL' | 'OK';
};

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeRiskSizing(input: RiskSizingInput): RiskSizingResult {
  const {
    snapshot,
    perContractRisk,
    minContracts = 1,
    maxContractsCap = 10,
    riskFractionPerTrade = 0.25,
  } = input;

  if (!isPositiveFinite(snapshot.dailyStartingBalance) || !isPositiveFinite(snapshot.maxDailyDrawdownPct)) {
    return {
      effectiveCapacity: null,
      suggestedRiskAmount: null,
      suggestedContracts: perContractRisk > 0 ? minContracts : 0,
      reason: 'NO_CONFIG',
    };
  }

  const remainingCapacity = snapshot.remainingRiskCapacity ?? 0;
  if (remainingCapacity <= 0) {
    return {
      effectiveCapacity: remainingCapacity,
      suggestedRiskAmount: 0,
      suggestedContracts: 0,
      reason: 'LOCKED_OUT',
    };
  }

  if (!isPositiveFinite(perContractRisk)) {
    return {
      effectiveCapacity: remainingCapacity,
      suggestedRiskAmount: 0,
      suggestedContracts: 0,
      reason: 'INVALID_PER_CONTRACT_RISK',
    };
  }

  const fraction = isPositiveFinite(riskFractionPerTrade) ? riskFractionPerTrade : 0.25;
  const targetRisk = remainingCapacity * fraction;
  const rawContracts = Math.floor(targetRisk / perContractRisk);
  let suggestedContracts = clamp(rawContracts, 0, maxContractsCap);
  if (suggestedContracts > 0 && suggestedContracts < minContracts) {
    if (targetRisk >= perContractRisk * minContracts) {
      suggestedContracts = clamp(minContracts, 0, maxContractsCap);
    }
  }

  if (suggestedContracts === 0) {
    return {
      effectiveCapacity: remainingCapacity,
      suggestedRiskAmount: 0,
      suggestedContracts: 0,
      reason: 'CAPACITY_TOO_SMALL',
    };
  }

  return {
    effectiveCapacity: remainingCapacity,
    suggestedRiskAmount: suggestedContracts * perContractRisk,
    suggestedContracts,
    reason: 'OK',
  };
}
