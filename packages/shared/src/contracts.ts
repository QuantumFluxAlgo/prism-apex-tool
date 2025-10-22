export type ContractType = 'standard' | 'micro' | 'spot' | 'index';

export interface SymbolSpec {
  symbol: string;
  description?: string;
  tickSize: number | null;
  tickValueUSD: number | null;
  contractType: ContractType;
  feedAvailable: boolean;
  tickSpecVerified: boolean;
}

export interface ContractsSpecFile {
  metadata?: { revision?: number; updatedAt?: string; notes?: string; reviewer?: string };
  symbols: SymbolSpec[];
}

let cache: ContractsSpecFile | null = null;

/** Loads the contracts spec JSON (cached after first load). */
export async function loadContractsSpec(): Promise<ContractsSpecFile> {
  if (cache) return cache;
  const mod = await import('../../../config/contracts-spec.json', {
    assert: { type: 'json' },
  } as any);
  const raw = (mod as { default?: unknown }).default ?? mod;
  const json = raw as ContractsSpecFile | null;
  if (!json || !Array.isArray(json.symbols)) {
    throw new Error('contracts-spec.json malformed: no data');
  }
  cache = json;
  return cache;
}

/** Clears the memoized spec; intended for tests. */
export function resetContractsSpecCache(): void {
  cache = null;
}

export async function getSpecByYahooSymbol(symbol: string): Promise<SymbolSpec | undefined> {
  const cfg = await loadContractsSpec();
  return cfg.symbols.find((spec) => spec.symbol === symbol);
}

export async function getTickSize(symbol: string): Promise<number | null> {
  const spec = await getSpecByYahooSymbol(symbol);
  return spec?.tickSize ?? null;
}

export async function getTickValueUSD(symbol: string): Promise<number | null> {
  const spec = await getSpecByYahooSymbol(symbol);
  return spec?.tickValueUSD ?? null;
}

export async function isSpecVerified(symbol: string): Promise<boolean> {
  const spec = await getSpecByYahooSymbol(symbol);
  return spec?.tickSpecVerified ?? false;
}
