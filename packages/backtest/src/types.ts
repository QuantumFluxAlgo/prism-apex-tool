export type Bar = {
  ts: string;     // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Signal = {
  ts: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  targets: number[]; // enforce <= 5R
  size: number;      // contracts/shares
  meta?: Record<string, unknown>;
};

export type Fill = {
  entryTs: string;
  exitTs: string;
  entryPx: number;
  exitPx: number;
  size: number;
  pnl: number;
  reason: 'STOP' | 'TARGET' | 'EOD';
  rMultiple: number;
};

export type BacktestConfig = {
  symbol: string;
  barInterval: '1m' | '5m';
  tz: 'UTC' | 'America/New_York' | 'Europe/London';
  session: { open: string; close: string }; // "14:30","21:59" in tz
  slippageTicks?: number; // default 0
  tickValue: number;      // PnL multiplier per price unit (e.g., ES $50/pt)
  maxRiskReward: number;  // 5 for Apex
  dailyLossCapUsd?: number;
  rngSeed?: number;
  mode: 'evaluation' | 'funded';
};

export type BacktestResult = {
  summary: {
    trades: number;
    winRate: number;
    avgR: number;
    netPnl: number;
    maxDD: number;
    days: number;
    ruleBreaches: string[];
  };
  daily: Array<{ date: string; pnl: number; wins: number; losses: number }>;
  fills: Fill[];
  meta: { config: BacktestConfig; startedAt: string; finishedAt: string };
};
