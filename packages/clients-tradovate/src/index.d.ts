import { Bar, Quote } from './types.js';
import { AuthEnv } from './auth.js';
export { createTelemetryClient, TelemetrySnapshot } from './telemetry.js';
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
export declare function createTradovateDemoClient(env: ClientEnv): Promise<TradovateClient>;
//# sourceMappingURL=index.d.ts.map
