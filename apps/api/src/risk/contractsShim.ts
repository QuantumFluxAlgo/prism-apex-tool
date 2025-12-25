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
  return CONTRACT_SPECS[key] ?? {
    symbol: key || symbol.toUpperCase(),
    tickSize: 1,
    tickValueUSD: 1,
    minContracts: 1,
  };
}

export function ticksToDollars(symbol: string, ticks: number): number {
  return ticks * getContractSpec(symbol).tickValueUSD;
}

export function priceDiffToTicks(symbol: string, from: number, to: number): number {
  const spec = getContractSpec(symbol);
  return spec.tickSize === 0 ? 0 : (to - from) / spec.tickSize;
}
