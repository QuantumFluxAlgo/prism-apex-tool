export class PrismApexClient {
  baseUrl;
  fetchImpl;
  constructor(baseUrl, fetchImpl = globalThis.fetch) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
  }
  async getSymbols() {
    const r = await this.fetchImpl(new URL('/market/symbols', this.baseUrl));
    if (!r.ok) throw new Error(`GET /market/symbols ${r.status}`);
    return r.json();
  }
  async getSessions() {
    const r = await this.fetchImpl(new URL('/market/sessions', this.baseUrl));
    if (!r.ok) throw new Error(`GET /market/sessions ${r.status}`);
    return r.json();
  }
  async osb(input) {
    const r = await this.fetchImpl(new URL('/signals/osb', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error(`POST /signals/osb ${r.status}`);
    return r.json();
  }
  async vwapFirstTouch(input) {
    const r = await this.fetchImpl(new URL('/signals/vwap-first-touch', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error(`POST /signals/vwap-first-touch ${r.status}`);
    return r.json();
  }
}
