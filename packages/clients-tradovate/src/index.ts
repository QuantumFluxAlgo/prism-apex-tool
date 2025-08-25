import { Bar, Quote } from './types.js';
import { login, AuthEnv } from './auth.js';
import { MarketDataWS } from './ws.js';
import { getContractMeta } from './contracts.js';
import { BarAggregator } from './bars.js';

export interface TradovateClient {
  subscribeBars(symbol: string, interval: '1m' | '5m', cb: (bar: Bar) => void): void;
  subscribeQuotes(symbol: string, cb: (q: Quote) => void): void;
  unsubscribe(symbol: string): void;
  getContractMeta(fullSymbol: string): Promise<any>;
  close(): void;
}

export interface ClientEnv extends AuthEnv {
  wsUrl: string;
}

export async function createTradovateDemoClient(env: ClientEnv): Promise<TradovateClient> {
  const tokens = await login(env);
  const ws = new MarketDataWS({ url: env.wsUrl, token: tokens.mdAccessToken });
  ws.connect();
  const bars = new Map<string, BarAggregator>();
  const quotes = new Map<string, (q: Quote) => void>();
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
