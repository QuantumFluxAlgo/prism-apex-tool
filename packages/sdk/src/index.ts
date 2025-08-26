import type {
  Bar,
  OSBInput,
  VWAPInput,
  SuggestionResult,
  SymbolsResponse,
  SessionsResponse,
} from './types.js';

export class PrismApexClient {
  constructor(
    private baseUrl: string,
    private fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async getSymbols(): Promise<SymbolsResponse> {
    const r = await this.fetchImpl(new URL('/market/symbols', this.baseUrl));
    if (!r.ok) throw new Error(`GET /market/symbols ${r.status}`);
    return r.json();
  }

  async getSessions(): Promise<SessionsResponse> {
    const r = await this.fetchImpl(new URL('/market/sessions', this.baseUrl));
    if (!r.ok) throw new Error(`GET /market/sessions ${r.status}`);
    return r.json();
  }

  async osb(input: OSBInput): Promise<SuggestionResult> {
    const r = await this.fetchImpl(new URL('/signals/osb', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error(`POST /signals/osb ${r.status}`);
    return r.json();
  }

  async vwapFirstTouch(input: VWAPInput): Promise<SuggestionResult> {
    const r = await this.fetchImpl(new URL('/signals/vwap-first-touch', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error(`POST /signals/vwap-first-touch ${r.status}`);
    return r.json();
  }
}

export type {
  Bar,
  OSBInput,
  VWAPInput,
  SuggestionResult,
  SymbolsResponse,
  SessionsResponse,
} from './types.js';
