/**
 * Config model for per-session flags (news, FOMC, roll, etc.).
 */
export enum SessionFlag {
  NEWS = 'NEWS',
  FOMC = 'FOMC',
  ROLL = 'ROLL',
  HOLIDAY = 'HOLIDAY',
  OTHER = 'OTHER',
}

export type SessionFlagConfigEntry = {
  symbolPattern: string;
  sessionDate: string;
  flags: SessionFlag[];
  note?: string;
};

export const SESSION_FLAGS_CONFIG: SessionFlagConfigEntry[] = [
  // Example placeholder (commented until we want behaviour tied to it):
  // {
  //   symbolPattern: 'ES*',
  //   sessionDate: '2025-11-15',
  //   flags: [SessionFlag.NEWS],
  //   note: 'Example news session placeholder',
  // },
];

export const matchesSymbolPattern = (pattern: string, symbol: string): boolean => {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return symbol.startsWith(prefix);
  }

  return pattern === symbol;
};
