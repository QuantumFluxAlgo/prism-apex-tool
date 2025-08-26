export interface Ticket {
  id: string;
  ts?: string;
  [key: string]: unknown;
}

export interface ParseResult {
  alert: {
    id: string;
    ts: string;
    symbol?: string;
    side?: 'BUY' | 'SELL';
    price?: number;
    reason?: string;
    raw: unknown;
  };
  human: { text: string };
}
