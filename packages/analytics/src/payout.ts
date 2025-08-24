export interface PayoutStatus {
  cumulativePnL: number;
  threshold: number;
  eligible: boolean;
  breached: boolean;
}

export const PAYOUT_THRESHOLD = 2500;

export function calculatePayoutStatus(
  dailyPnL: number,
  breaches: unknown[] = [],
  prevStatus: PayoutStatus = {
    cumulativePnL: 0,
    threshold: PAYOUT_THRESHOLD,
    eligible: false,
    breached: false,
  },
): PayoutStatus {
  const cumulativePnL = prevStatus.cumulativePnL + dailyPnL;
  const breached = prevStatus.breached || breaches.length > 0;
  const eligible = cumulativePnL >= PAYOUT_THRESHOLD && !breached;
  // TODO(Phase 3): persist payout status
  return { cumulativePnL, threshold: PAYOUT_THRESHOLD, eligible, breached };
}

export function getInitialPayoutStatus(): PayoutStatus {
  return {
    cumulativePnL: 0,
    threshold: PAYOUT_THRESHOLD,
    eligible: false,
    breached: false,
  };
}
