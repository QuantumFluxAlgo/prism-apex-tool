export type Tick = {
  ts: string;          // ISO timestamp
  price: number;       // last traded price
  size?: number;       // trade size (optional)
  bid?: number;        // optional top of book
  ask?: number;        // optional top of book
};

export type TickWindow = {
  startTs: string;
  endTs: string;
  count: number;
};
