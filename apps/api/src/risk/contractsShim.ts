export interface ContractSpec {
  symbol: string;
  tickSize: number;
  tickValueUSD: number;
  minContracts: number;
  maxContracts?: number;
}

const CONTRACT_SPECS: Record<string, ContractSpec> = {
  ES: { symbol: 'ES', tickSize: 0.25, tickValueUSD: 12.5, minContracts: 1 },
  MES: { symbol: 'MES', tickSize: 0.25, tickValueUSD: 1.25, minContracts: 1 },
  NQ: { symbol: 'NQ', tickSize: 0.25, tickValueUSD: 5, minContracts: 1 },
  MNQ: { symbol: 'MNQ', tickSize: 0.25, tickValueUSD: 0.5, minContracts: 1 },
  YM: { symbol: 'YM', tickSize: 1, tickValueUSD: 5, minContracts: 1 },
  RTY: { symbol: 'RTY', tickSize: 0.1, tickValueUSD: 5, minContracts: 1 },
  GC: { symbol: 'GC', tickSize: 0.1, tickValueUSD: 10, minContracts: 1 },
  CL: { symbol: 'CL', tickSize: 0.01, tickValueUSD: 10, minContracts: 1 },
  '6E': { symbol: '6E', tickSize: 0.00005, tickValueUSD: 6.25, minContracts: 1 },
  EURUSD: { symbol: 'EURUSD', tickSize: 0.0001, tickValueUSD: 12.5, minContracts: 1 },
  'BTC-USD': { symbol: 'BTC-USD', tickSize: 1, tickValueUSD: 1, minContracts: 1 },
};

function normalizeSymbol(symbol: string): string {
  const trimmed = symbol?.trim().toUpperCase() ?? '';
  if (!trimmed) return '';
  const idx = trimmed.indexOf('=');
  if (idx >= 0) {
    return trimmed.slice(0, idx);
  }
  return trimmed;
}

export function getContractSpec(symbol: string): ContractSpec {
  const key = normalizeSymbol(symbol);
  const spec = CONTRACT_SPECS[key];
  if (!spec) {
    throw new Error(`Unknown contract spec for symbol "${symbol}"`);
  }
  return spec;
}

export function ticksToDollars(symbol: string, ticks: number): number {
  return ticks * getContractSpec(symbol).tickValueUSD;
}

export function priceDiffToTicks(symbol: string, from: number, to: number): number {
  const spec = getContractSpec(symbol);
  return spec.tickSize === 0 ? 0 : (to - from) / spec.tickSize;
}
