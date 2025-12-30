const DEFAULT_MARKET_SYMBOLS =
  'ES=F,NQ=F,MES=F,MNQ=F,YM=F,RTY=F,GC=F,CL=F,6E=F,EURUSD=X,BTC-USD';

function parseCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getMarketSymbols(): string[] {
  const fromEnv =
    process.env.MARKET_SNAPSHOT_SYMBOLS ??
    process.env.INGEST_YAHOO_SYMBOLS ??
    process.env.YAHOO_SYMBOLS ??
    '';
  const parsed = parseCsv(fromEnv);
  if (parsed.length) return parsed;
  return DEFAULT_MARKET_SYMBOLS.split(',');
}

export function getDisplaySymbol(symbol: string): string {
  if (!symbol) return symbol;
  if (symbol.includes('=')) return symbol.split('=')[0];
  if (symbol.includes('-')) return symbol.split('-')[0];
  return symbol.replace(/[^A-Za-z0-9]/g, '');
}

export function resolveSessionDate(override?: string): string {
  if (override && override.trim().length >= 10) {
    return override.trim().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export type SessionWindow = {
  start: Date;
  end: Date;
};

const DEFAULT_OPEN_UTC = '14:30';
const DEFAULT_CLOSE_UTC = '21:00';

function parseHm(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map((part) => Number(part));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

export function getSessionWindowForDate(sessionDate: string): SessionWindow {
  const openHm = (process.env.SESSION_OPEN_UTC ?? DEFAULT_OPEN_UTC).slice(0, 5);
  const closeHm = (process.env.SESSION_CLOSE_UTC ?? DEFAULT_CLOSE_UTC).slice(
    0,
    5,
  );
  const base = new Date(`${sessionDate}T00:00:00.000Z`);
  const open = new Date(base);
  const { h: openH, m: openM } = parseHm(openHm);
  open.setUTCHours(openH, openM, 0, 0);

  const close = new Date(base);
  const { h: closeH, m: closeM } = parseHm(closeHm);
  close.setUTCHours(closeH, closeM, 0, 0);
  if (close <= open) {
    close.setUTCDate(close.getUTCDate() + 1);
  }

  return { start: open, end: close };
}

export function determineSessionStatus(
  window: SessionWindow,
  now = new Date(),
): 'PRE' | 'OPEN' | 'CLOSED' {
  if (now < window.start) return 'PRE';
  if (now > window.end) return 'CLOSED';
  return 'OPEN';
}
