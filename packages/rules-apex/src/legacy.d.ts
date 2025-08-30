export type Side = 'long' | 'short';
export type TicketInput = {
  symbol: string;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  timestampUtc?: string;
  meta?: Record<string, unknown>;
};
export declare function withinSuppressionWindow(
  now: Date,
  flatByUtc: string,
  minutes: number,
): boolean;
export declare function evaluateTicket(
  input: TicketInput,
  opts: {
    minRR: number;
    maxRR: number;
    flatByUtc: string;
    now?: Date;
  },
):
  | {
      decision: 'accept';
      rr: number;
      reasons: string[];
      normalized: TicketInput;
      suggestions: {
        halfSizeSuggested: boolean;
      };
    }
  | {
      decision: 'reject';
      rr?: number;
      reasons: string[];
    };
export declare function suggestPercent(
  maxContracts: number,
  bufferCleared: boolean,
  pctNoBuffer: number,
  pctWithBuffer: number,
): {
  contracts: number;
  halfSizeSuggested: boolean;
};
//# sourceMappingURL=legacy.d.ts.map
