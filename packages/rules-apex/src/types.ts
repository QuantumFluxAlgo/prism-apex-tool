export type Side = 'long' | 'short';

export type TicketInput = {
  symbol: string; // e.g. ES, NQ, MES, MNQ or full code
  side: Side;
  entry: number;
  stop: number;
  target: number;
  timestampUtc?: string; // ISO
  meta?: Record<string, unknown>;
};

export type AccountInfo = {
  id: string;
  maxContracts: number; // plan max
  bufferCleared: boolean; // true if trailing DD buffer cleared
};

export type EvaluateResult =
  | {
      decision: 'accept';
      rr: number;
      reasons: string[];
      normalized: TicketInput;
      suggestions: { halfSizeSuggested: boolean };
    }
  | { decision: 'reject'; rr?: number; reasons: string[] };
