import type {
  OSBInput,
  VWAPInput,
  SuggestionResult,
  SymbolsResponse,
  SessionsResponse,
} from './types.js';
export declare class PrismApexClient {
  private baseUrl;
  private fetchImpl;
  constructor(baseUrl: string, fetchImpl?: typeof fetch);
  getSymbols(): Promise<SymbolsResponse>;
  getSessions(): Promise<SessionsResponse>;
  osb(input: OSBInput): Promise<SuggestionResult>;
  vwapFirstTouch(input: VWAPInput): Promise<SuggestionResult>;
}
export type {
  Bar,
  OSBInput,
  VWAPInput,
  SuggestionResult,
  SymbolsResponse,
  SessionsResponse,
} from './types.js';
//# sourceMappingURL=index.d.ts.map
