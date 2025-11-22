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

export function getContractSpec(symbol: string): ContractSpec {
  return CONTRACT_SPECS[symbol.toUpperCase()] ?? {
    symbol: symbol.toUpperCase(),
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
