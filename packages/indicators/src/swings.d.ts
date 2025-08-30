import type { Bar1m } from './types.js';
export interface SwingPoint {
  index: number;
  ts: string;
  price: number;
  type: 'PH' | 'PL';
}
export declare function swings(bars: Bar1m[], k: number): SwingPoint[];
//# sourceMappingURL=swings.d.ts.map
