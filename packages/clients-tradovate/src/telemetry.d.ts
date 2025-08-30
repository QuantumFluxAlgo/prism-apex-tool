import { AuthEnv } from './auth.js';
export type TelemetrySnapshot = {
  accounts: Array<{
    accountId: string;
    balance: number;
    buyingPower?: number;
  }>;
  positions: Array<{
    accountId: string;
    contract: string;
    symbolRoot: string;
    qty: number;
    avgPrice: number;
    unrealizedPnL?: number;
  }>;
  fills: Array<{
    accountId: string;
    contract: string;
    side: 'BUY' | 'SELL';
    qty: number;
    price: number;
    ts: string;
  }>;
  dailyPnL: Array<{
    date: string;
    net: number;
  }>;
  bufferCleared: boolean;
};
export interface Env extends AuthEnv {
  bufferThreshold: number;
}
export declare function createTelemetryClient(
  env: Env,
  opts?: {
    pollMs?: number;
  },
): {
  start(onSnapshot: (snap: TelemetrySnapshot) => void): {
    stop(): void;
  };
};
//# sourceMappingURL=telemetry.d.ts.map
