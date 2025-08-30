import { login } from './auth.js';
import { MarketDataWS } from './ws.js';
import { getContractMeta } from './contracts.js';
import { BarAggregator } from './bars.js';
export { createTelemetryClient } from './telemetry.js';
export async function createTradovateDemoClient(env) {
  const tokens = await login(env);
  const ws = new MarketDataWS({ url: env.wsUrl, token: tokens.mdAccessToken });
  ws.connect();
  const bars = new Map();
  const quotes = new Map();
  return {
    subscribeBars(symbol, _interval, cb) {
      bars.set(symbol, new BarAggregator(symbol, symbol, 'RTH', cb));
    },
    subscribeQuotes(symbol, cb) {
      quotes.set(symbol, cb);
    },
    unsubscribe(symbol) {
      bars.delete(symbol);
      quotes.delete(symbol);
    },
    getContractMeta: (s) => getContractMeta(env.restBase, s),
    close() {
      ws.close();
    },
  };
}
