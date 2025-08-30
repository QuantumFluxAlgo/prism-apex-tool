export function getPhasePolicy(phase) {
  if (phase === 'funded') {
    return {
      requireStop: true,
      minRR: 1.5,
      maxRR: 5.0,
      halfSizeUntilBuffer: true,
      antiWindfall: true,
    };
  }
  return {
    requireStop: false,
    minRR: 1.5,
    maxRR: 5.0,
    halfSizeUntilBuffer: true,
    antiWindfall: false,
  };
}
