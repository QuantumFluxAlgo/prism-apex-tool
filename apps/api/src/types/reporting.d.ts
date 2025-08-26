declare module '@prism-apex-tool/reporting' {
  export interface DailyTicketRow {
    when: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    qty: number;
    entry: number;
    stop: number;
    targets: number[];
    apex_blocked: boolean;
    reasons: string[];
  }

  export interface DailySummary {
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
  }

  export interface DailyJson {
    summary: DailySummary;
    tickets: DailyTicketRow[];
    alerts: any[];
    breaches: any[];
  }

  export function toDailyCSV(j: DailyJson): string;
}
