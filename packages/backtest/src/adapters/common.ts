import type { Bar, Signal } from '../types';

export type TickAwareAdapter = {
  onBar(bar: Bar, hist: Bar[]): Signal[];
  onTick?: (price: number, ts: string) => Signal[];
};

// helper for adapters to no-op onTick
export function withNoopOnTick<T extends { onBar: any }>(adapter: T): T & { onTick: (price:number, ts:string)=>any[] } {
  return Object.assign(adapter, { onTick: () => [] });
}
