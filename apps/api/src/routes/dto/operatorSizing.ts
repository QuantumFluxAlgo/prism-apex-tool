import type { RiskSizingResult } from '../../services/riskSizing.js';

export type NextTradeSizingDto = {
  dateUtc: string;
  perContractRisk: number;
  minContracts: number;
  maxContractsCap: number;
  riskFractionPerTrade: number;
  snapshot: {
    dailyStartingBalance: number | null;
    maxDailyDrawdownPct: number | null;
    maxDailyLossAmount: number | null;
    realisedPnL: number;
    openRisk: number;
    drawdownAmount: number;
    remainingRiskCapacity: number | null;
    isLockedOut: boolean | null;
  };
  sizing: RiskSizingResult;
};
