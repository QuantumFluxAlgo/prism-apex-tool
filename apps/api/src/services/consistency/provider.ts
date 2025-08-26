export interface PnlProvider {
  getDailyPnL(accountId: string, start: string, end: string): Promise<{ date: string; net: number }[]>;
}
