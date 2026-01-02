import { AccountPhase } from './types.js';

export type PhasePolicy = {
  requireStop: boolean;
  minRR: number;
  maxRR: number;
  halfSizeUntilBuffer: boolean;
  antiWindfall: boolean;
};

export function getPhasePolicy(phase: AccountPhase): PhasePolicy {
  if (phase === 'funded') {
    return {
      requireStop: true,
      minRR: 1.2,
      maxRR: 4.5,
      halfSizeUntilBuffer: true,
      antiWindfall: true,
    };
  }
  return {
    requireStop: false,
    minRR: 1.2,
    maxRR: 4.5,
    halfSizeUntilBuffer: true,
    antiWindfall: false,
  };
}
