import { AccountPhase } from './types.js';
export type PhasePolicy = {
  requireStop: boolean;
  minRR: number;
  maxRR: number;
  halfSizeUntilBuffer: boolean;
  antiWindfall: boolean;
};
export declare function getPhasePolicy(phase: AccountPhase): PhasePolicy;
//# sourceMappingURL=config.d.ts.map
