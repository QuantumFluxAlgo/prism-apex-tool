interface WsLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: any }) => void) | null;
  send(data: any): void;
  close(): void;
}
export interface WSConfig {
  url: string;
  token: string;
  WebSocketCtor?: new (url: string) => WsLike;
  onMessage?: (data: any) => void;
}
export declare class MarketDataWS {
  private cfg;
  private ws;
  private hb?;
  private reconnectAttempts;
  private WsCtor;
  constructor(cfg: WSConfig);
  connect(): void;
  private startHeartbeat;
  private stopHeartbeat;
  private scheduleReconnect;
  close(): void;
}
export {};
//# sourceMappingURL=ws.d.ts.map
