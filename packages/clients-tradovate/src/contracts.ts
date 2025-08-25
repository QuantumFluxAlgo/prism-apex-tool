import { ContractMeta, TradovateClientError } from './types.js';

export async function getContractMeta(restBase: string, fullSymbol: string): Promise<ContractMeta> {
  const resp = await fetch(`${restBase}/contract/find?name=${encodeURIComponent(fullSymbol)}`);
  if (!resp.ok) throw new TradovateClientError(`contract ${resp.status}`);
  const data = (await resp.json()) as any;
  const c = Array.isArray(data) ? data[0] : data;
  return {
    fullSymbol: fullSymbol,
    tickSize: Number(c.tickSize ?? c.minPriceIncrement ?? 0),
    tickValue: Number(c.tickValue ?? c.valuePerPoint ?? 0),
    minTick: Number(c.minTick ?? c.minPriceIncrement ?? 0),
    multiplier: Number(c.multiplier ?? c.contractSize ?? 1),
  };
}
