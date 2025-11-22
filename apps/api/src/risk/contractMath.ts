import {
  getContractSpec as getSharedContractSpec,
  ticksToDollars as specTicksToDollars,
  priceDiffToTicks as specPriceDiffToTicks,
  type ContractSpec,
} from './contractsShim.js';

/**
 * Unified contract & risk math utilities backed by the shared contracts spec.
 */
export class ContractMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractMathError';
  }
}

export interface InstrumentSpec {
  symbol: string;
  tickSize: number;
  dollarsPerTick: number;
  minContracts: number;
  maxContracts?: number;
}

function resolveContractSpec(symbol: string): ContractSpec {
  try {
    return getSharedContractSpec(symbol);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown contract spec';
    throw new ContractMathError(message);
  }
}

export function getInstrumentSpec(symbol: string): InstrumentSpec {
  const spec = resolveContractSpec(symbol);
  return {
    symbol: spec.symbol,
    tickSize: spec.tickSize,
    dollarsPerTick: spec.tickValueUSD,
    minContracts: spec.minContracts,
    maxContracts: spec.maxContracts,
  };
}

export function ticksToDollars(symbol: string, ticks: number): number {
  if (!Number.isFinite(ticks)) {
    throw new ContractMathError('ticks must be a finite number');
  }
  resolveContractSpec(symbol); // ensure known
  return specTicksToDollars(symbol, ticks);
}

export function dollarsToContracts(symbol: string, riskDollars: number, stopDistanceTicks: number): number {
  if (!Number.isFinite(riskDollars) || riskDollars <= 0) {
    throw new ContractMathError('riskDollars must be > 0');
  }
  if (!Number.isFinite(stopDistanceTicks) || stopDistanceTicks <= 0) {
    throw new ContractMathError('stopDistanceTicks must be > 0');
  }

  const spec = resolveContractSpec(symbol);
  const riskPerContract = Math.abs(specTicksToDollars(symbol, stopDistanceTicks));
  if (riskPerContract <= 0) {
    throw new ContractMathError('riskPerContract must be > 0');
  }

  const rawContracts = Math.floor(riskDollars / riskPerContract);
  if (rawContracts <= 0) {
    return 0;
  }

  const maxContracts = spec.maxContracts ?? Number.MAX_SAFE_INTEGER;
  const clamped = Math.min(rawContracts, maxContracts);
  return Math.max(spec.minContracts, clamped);
}

export function computeTradeRisk(symbol: string, contracts: number, stopDistanceTicks: number): number {
  if (!Number.isFinite(contracts) || contracts < 0) {
    throw new ContractMathError('contracts must be >= 0');
  }
  if (!Number.isFinite(stopDistanceTicks) || stopDistanceTicks <= 0) {
    throw new ContractMathError('stopDistanceTicks must be > 0');
  }
  if (contracts === 0) {
    return 0;
  }

  resolveContractSpec(symbol);
  const riskPerContract = Math.abs(specTicksToDollars(symbol, stopDistanceTicks));
  return contracts * riskPerContract;
}

export function computePnlDollars(symbol: string, entryPrice: number, exitPrice: number, contracts: number): number {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(exitPrice)) {
    throw new ContractMathError('entryPrice and exitPrice must be finite numbers');
  }
  if (!Number.isFinite(contracts) || contracts < 0) {
    throw new ContractMathError('contracts must be >= 0');
  }
  if (contracts === 0) {
    return 0;
  }

  const spec = resolveContractSpec(symbol);
  const ticksMoved = specPriceDiffToTicks(symbol, entryPrice, exitPrice);
  const pnlPerContract = specTicksToDollars(symbol, ticksMoved);
  return pnlPerContract * contracts;
}

export function priceDiffToTicks(symbol: string, fromPrice: number, toPrice: number): number {
  if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice)) {
    throw new ContractMathError('prices must be finite numbers');
  }
  resolveContractSpec(symbol);
  return specPriceDiffToTicks(symbol, fromPrice, toPrice);
}
