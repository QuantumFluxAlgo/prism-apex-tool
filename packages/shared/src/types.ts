export type SymbolCode = 'ES' | 'NQ' | 'MES' | 'MNQ';
export type Interval = '1m' | '5m';

export interface Bar {
  /** ISO 8601 timestamp in UTC */
  readonly ts: string;
  readonly symbol: SymbolCode;
  readonly interval: Interval;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
  readonly v: number;
}

export interface AccountState {
  readonly netLiq: number;
  readonly cash: number;
  readonly margin: number;
  readonly dayPnlRealized: number;
  readonly dayPnlUnrealized: number;
}

export interface Position {
  readonly symbol: SymbolCode;
  readonly qty: number;
  readonly avgPrice: number;
  readonly unrealizedPnl: number;
}

export type Side = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'WORKING' | 'FILLED' | 'CANCELED';

export interface Order {
  readonly id: string;
  readonly symbol: SymbolCode;
  readonly side: Side;
  readonly type: OrderType;
  readonly limitPrice?: number;
  readonly stopPrice?: number;
  readonly status: OrderStatus;
  readonly ocoGroupId?: string;
}

export interface Ticket {
  readonly id: string;
  readonly symbol: SymbolCode;
  readonly contract: string; // e.g., ESU5
  readonly side: Side;
  readonly qty: number;
  readonly order: {
    readonly type: OrderType;
    readonly entry: number;
    readonly stop: number;
    readonly targets: readonly number[];
    readonly tif: 'DAY';
    readonly oco: true;
  };
  readonly risk: {
    readonly perTradeUsd: number;
    readonly rMultipleByTarget: readonly number[];
  };
  readonly apex: {
    readonly stopRequired: boolean;
    readonly rrLeq5: boolean;
    readonly ddHeadroom: boolean;
    readonly halfSize: boolean;
    readonly eodReady: boolean;
    readonly consistency30: 'OK' | 'WARN' | 'FAIL';
  };
  readonly notes?: string;
}

/** Runtime type guard for {@link Bar}. */
export function isBar(value: unknown): value is Bar {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  const symbols: readonly SymbolCode[] = ['ES', 'NQ', 'MES', 'MNQ'];
  const intervals: readonly Interval[] = ['1m', '5m'];
  return (
    typeof b.ts === 'string' &&
    symbols.includes(b.symbol as SymbolCode) &&
    intervals.includes(b.interval as Interval) &&
    typeof b.o === 'number' &&
    typeof b.h === 'number' &&
    typeof b.l === 'number' &&
    typeof b.c === 'number' &&
    typeof b.v === 'number'
  );
}
