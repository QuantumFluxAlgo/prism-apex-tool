import rawContractsSpec from '../config/contracts-spec.json' with { type: 'json' };

export type ContractType = 'standard' | 'micro' | 'spot' | 'index';

export interface SymbolSpec {
  symbol: string;
  aliases?: string[];
  description?: string;
  tickSize: number | null;
  tickValueUSD: number | null;
  contractMultiplier?: number | null;
  contractType: ContractType;
  feedAvailable: boolean;
  tickSpecVerified: boolean;
  minContracts?: number | null;
  maxContracts?: number | null;
}

export interface ContractsSpecFile {
  metadata?: { revision?: number; updatedAt?: string; notes?: string; reviewer?: string };
  symbols: SymbolSpec[];
}

export interface ContractSpec {
  symbol: string;
  description?: string;
  tickSize: number;
  tickValueUSD: number;
  contractMultiplier: number;
  contractType: ContractType;
  feedAvailable: boolean;
  tickSpecVerified: boolean;
  minContracts: number;
  maxContracts?: number;
  aliases: string[];
}

type NormalizedMap<T> = Map<string, T>;

const SPEC_FILE: ContractsSpecFile = rawContractsSpec as ContractsSpecFile;
let specCache: ContractsSpecFile | null = SPEC_FILE;

const symbolLookup: NormalizedMap<SymbolSpec> = new Map();
const contractLookup: NormalizedMap<ContractSpec> = new Map();

function assertFinite(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function normalizeSymbol(symbol: string): string {
  const trimmed = symbol?.trim();
  if (!trimmed) {
    throw new Error('symbol is required');
  }
  const upper = trimmed.toUpperCase();
  const eqIndex = upper.indexOf('=');
  if (eqIndex >= 0) {
    return upper.slice(0, eqIndex);
  }
  return upper;
}

function collectAliasKeys(spec: SymbolSpec): string[] {
  const aliases = new Set<string>();
  aliases.add(spec.symbol);
  for (const alias of spec.aliases ?? []) {
    if (alias) {
      aliases.add(alias);
    }
  }
  return Array.from(aliases);
}

function toContractSpec(record: SymbolSpec): ContractSpec | null {
  if (
    record.tickSize === null ||
    record.tickValueUSD === null ||
    record.contractMultiplier === null
  ) {
    return null;
  }

  const tickSize = Number(record.tickSize);
  const tickValueUSD = Number(record.tickValueUSD);
  const contractMultiplier = Number(record.contractMultiplier);

  if (!(tickSize > 0) || !(tickValueUSD > 0) || !(contractMultiplier > 0)) {
    return null;
  }

  const minContracts =
    typeof record.minContracts === 'number' && record.minContracts > 0
      ? Math.floor(record.minContracts)
      : 1;
  const maxContracts =
    typeof record.maxContracts === 'number' && record.maxContracts > 0
      ? Math.floor(record.maxContracts)
      : undefined;

  return {
    symbol: normalizeSymbol(record.symbol),
    description: record.description,
    tickSize,
    tickValueUSD,
    contractMultiplier,
    contractType: record.contractType,
    feedAvailable: record.feedAvailable,
    tickSpecVerified: record.tickSpecVerified,
    minContracts,
    maxContracts,
    aliases: [...(record.aliases ?? [])],
  };
}

for (const record of SPEC_FILE.symbols ?? []) {
  const keys = collectAliasKeys(record).map((alias) => normalizeSymbol(alias));
  for (const key of keys) {
    symbolLookup.set(key, record);
  }

  const contractSpec = toContractSpec(record);
  if (contractSpec) {
    for (const key of keys) {
      contractLookup.set(key, contractSpec);
    }
  }
}

/** Loads the immutable contracts spec JSON (cached to mimic legacy API). */
export async function loadContractsSpec(): Promise<ContractsSpecFile> {
  if (!specCache) {
    specCache = SPEC_FILE;
  }
  return specCache;
}

/** Clears the memoized spec; next loadContractsSpec call recreates the cache. */
export function resetContractsSpecCache(): void {
  specCache = null;
}

export async function getSpecByYahooSymbol(symbol: string): Promise<SymbolSpec | undefined> {
  const normalized = normalizeSymbol(symbol);
  return symbolLookup.get(normalized);
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

export function getContractSpec(symbol: string): ContractSpec {
  const normalized = normalizeSymbol(symbol);
  const spec = contractLookup.get(normalized);
  if (!spec) {
    throw new Error(`No contract spec found for symbol "${symbol}"`);
  }
  return spec;
}

export function contractSymbolExists(symbol: string): boolean {
  try {
    getContractSpec(symbol);
    return true;
  } catch {
    return false;
  }
}

export function ticksToDollars(spec: ContractSpec, ticks: number): number {
  assertFinite(ticks, 'ticks');
  return ticks * spec.tickValueUSD;
}

export function priceDiffToTicks(spec: ContractSpec, fromPrice: number, toPrice: number): number {
  assertFinite(fromPrice, 'fromPrice');
  assertFinite(toPrice, 'toPrice');
  if (!(spec.tickSize > 0)) {
    throw new Error(`Invalid tick size for symbol "${spec.symbol}"`);
  }
  return (toPrice - fromPrice) / spec.tickSize;
}
