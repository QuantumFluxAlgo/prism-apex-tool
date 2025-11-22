/**
 * Unified contract & risk math utilities.
 *
 * Acts as the single source of truth for tick/dollar/contract conversions
 * so strategies, risk engine, and UI can stay consistent.
 */
export class ContractMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractMathError';
  }
}

export interface InstrumentSpec {
  symbol: string;
  tickSize: number; // Minimum price increment
  dollarsPerTick: number; // Dollar value per tick per contract
  minContracts: number; // Smallest tradable size
  maxContracts?: number; // Optional soft clamp for downstream risk checks
}

const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  ES: {
    symbol: 'ES',
    tickSize: 0.25,
    dollarsPerTick: 12.5,
    minContracts: 1,
  },
  NQ: {
    symbol: 'NQ',
    tickSize: 0.25,
    dollarsPerTick: 5,
    minContracts: 1,
  },
};

function normalizeSymbol(symbol: string): string {
  const trimmed = symbol?.trim().toUpperCase();
  if (!trimmed) {
    throw new ContractMathError('symbol is required');
  }
  return trimmed;
}

export function getInstrumentSpec(symbol: string): InstrumentSpec {
  const normalized = normalizeSymbol(symbol);
  const spec = INSTRUMENT_SPECS[normalized];
  if (!spec) {
    throw new ContractMathError(`Unknown instrument symbol: ${symbol}`);
  }
  return spec;
}

export function ticksToDollars(symbol: string, ticks: number): number {
  if (!Number.isFinite(ticks)) {
    throw new ContractMathError('ticks must be a finite number');
  }
  const spec = getInstrumentSpec(symbol);
  return ticks * spec.dollarsPerTick;
}

export function dollarsToContracts(symbol: string, riskDollars: number, stopDistanceTicks: number): number {
  if (!Number.isFinite(riskDollars) || riskDollars <= 0) {
    throw new ContractMathError('riskDollars must be > 0');
  }
  if (!Number.isFinite(stopDistanceTicks) || stopDistanceTicks <= 0) {
    throw new ContractMathError('stopDistanceTicks must be > 0');
  }

  const spec = getInstrumentSpec(symbol);
  const riskPerContract = ticksToDollars(spec.symbol, stopDistanceTicks);
  if (riskPerContract <= 0) {
    throw new ContractMathError('riskPerContract must be > 0');
  }

  const contracts = Math.floor(riskDollars / riskPerContract);
  if (contracts <= 0) {
    return 0;
  }

  const min = spec.minContracts;
  const max = spec.maxContracts ?? Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(contracts, max));
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

  const spec = getInstrumentSpec(symbol);
  const riskPerContract = ticksToDollars(spec.symbol, stopDistanceTicks);
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

  const spec = getInstrumentSpec(symbol);
  const priceDiff = exitPrice - entryPrice;
  const ticksMoved = priceDiff / spec.tickSize;
  const pnlPerContract = ticksToDollars(spec.symbol, ticksMoved);
  return pnlPerContract * contracts;
}
