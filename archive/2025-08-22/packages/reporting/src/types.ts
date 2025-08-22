export type DailyTicketRow = {
  when: string;            // ISO
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entry: number;
  stop: number;
  targets: number[];
  apex_blocked: boolean;
  reasons: string[];
};

export type DailySummary = {
  date: string;
  ticketsCount: number;
  blockedCount: number;
  alertsAcked: number;
  alertsQueued: number;
  pnl: {
    realized: number;
    unrealized: number;
    netLiq: number;
  };
};

export type DailyJson = {
  summary: DailySummary;
  tickets: DailyTicketRow[];
  alerts: {
    id: string;
    ts: string;
    symbol?: string;
    side?: 'BUY'|'SELL';
    price?: number;
    reason?: string;
    acknowledged: boolean;
  }[];
  breaches: { when: string; reasons: string[] }[];
};
