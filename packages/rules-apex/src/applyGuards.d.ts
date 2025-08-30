import { Suggestion, Ticket, AccountPhase } from './types.js';
export type GuardContext = {
  phase: AccountPhase;
  account: {
    id: string;
    maxContracts: number;
  };
  bufferCleared: boolean;
  recentSizes: number[];
  contract: string;
  now?: Date;
};
export declare function applyGuardWithSizing(
  s: Suggestion,
  ctx: GuardContext,
): {
  accepted: boolean;
  ticket?: Ticket;
  reasons?: string[];
};
//# sourceMappingURL=applyGuards.d.ts.map
