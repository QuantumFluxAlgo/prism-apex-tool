export type DailyRiskSnapshotDto = {
  dateUtc: string;
  dailyStartingBalance: number | null;
  maxDailyDrawdownPct: number | null;
  maxDailyLossAmount: number | null;
  realisedPnL: number;
  openRisk: number;
  drawdownAmount: number;
  remainingRiskCapacity: number | null;
  isLockedOut: boolean | null;
};

export async function fetchDailyRiskSnapshot(params?: { dateUtc?: string }): Promise<DailyRiskSnapshotDto> {
  const search = params?.dateUtc ? `?dateUtc=${encodeURIComponent(params.dateUtc)}` : '';
  const res = await fetch(`/api/operator-risk/daily${search}`);
  if (!res.ok) {
    throw new Error(`Failed to load daily risk snapshot (${res.status})`);
  }
  const data = (await res.json()) as DailyRiskSnapshotDto;
  return data;
}
