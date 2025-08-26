export interface PnlProvider {
  getDailyNetPnl(
    accountId: string,
    startIso: string,
    endIso: string,
  ): Promise<Array<{ date: string; net: number }>>;
  upsert?(accountId: string, date: string, net: number): Promise<void>;
}
