export interface PnlProvider {
  getDailyPnL(accountId: string, start: string, end: string): Promise<{ date: string; net: number }[]>;
  upsert?(accountId: string, date: string, net: number): Promise<void> | void;
}
