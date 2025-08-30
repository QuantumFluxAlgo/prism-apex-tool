import { Suggestion } from '../types.js';
export type SizeContext = {
  bufferCleared: boolean;
  accountMax: number;
  recentSizes: number[];
};
export type SizePolicy = {
  halfSizeUntilBuffer: boolean;
  antiWindfall: boolean;
};
export declare function guardSize(
  s: Suggestion,
  ctx: SizeContext,
  policy: SizePolicy,
):
  | {
      ok: true;
      qty: number;
      guardrails: string[];
      sizingHint?: string;
      consistencyNotes?: string;
    }
  | {
      ok: false;
      reason: string;
    };
//# sourceMappingURL=size.d.ts.map
