export interface StakeSizingInput {
  stakeDollars: number;
  tickValue: number;
  ticksToStop: number;
}

export interface StakeSizingResult {
  contracts: number;
  riskDollars: number;
}

/**
 * Simple helper that converts a dollar stake + ticks-to-stop into a whole number
 * of contracts, along with the implied risk dollars.
 *
 * This is intentionally conservative and deterministic so that all strategies
 * size trades the same way.
 */
export function computePositionFromStake(input: StakeSizingInput): StakeSizingResult {
  const { stakeDollars, tickValue, ticksToStop } = input;
  if (
    typeof stakeDollars !== 'number' ||
    typeof tickValue !== 'number' ||
    typeof ticksToStop !== 'number' ||
    !Number.isFinite(stakeDollars) ||
    !Number.isFinite(tickValue) ||
    !Number.isFinite(ticksToStop) ||
    tickValue <= 0 ||
    ticksToStop <= 0
  ) {
    return { contracts: 0, riskDollars: 0 };
  }

  const riskPerContract = tickValue * ticksToStop;
  if (riskPerContract <= 0) {
    return { contracts: 0, riskDollars: 0 };
  }

  const rawContracts = stakeDollars / riskPerContract;
  const contracts = Math.max(0, Math.floor(rawContracts));
  const riskDollars = contracts * riskPerContract;

  return { contracts, riskDollars };
}
