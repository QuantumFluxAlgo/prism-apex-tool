import {
  SESSION_FLAGS_CONFIG,
  SessionFlag,
  type SessionFlagConfigEntry,
  matchesSymbolPattern,
} from '../../config/session-flags.js';

export type SessionFlagsSummary = {
  flags: SessionFlag[];
  hasNewsFlag: boolean;
};

export type SessionFlagsService = {
  getFlagsForSession(symbol: string, sessionDate: string): SessionFlagsSummary;
};

const isNewsFlag = (flag: SessionFlag): boolean => {
  switch (flag) {
    case SessionFlag.NEWS:
    case SessionFlag.FOMC:
      return true;
    default:
      return false;
  }
};

const aggregateFlags = (
  entries: SessionFlagConfigEntry[],
  symbol: string,
  sessionDate: string,
): SessionFlagsSummary => {
  const collected = new Set<SessionFlag>();

  for (const entry of entries) {
    if (entry.sessionDate !== sessionDate) continue;
    if (!matchesSymbolPattern(entry.symbolPattern, symbol)) continue;

    for (const flag of entry.flags) {
      collected.add(flag);
    }
  }

  const flags = Array.from(collected);
  const hasNewsFlag = flags.some(isNewsFlag);

  return { flags, hasNewsFlag };
};

export const createSessionFlagsService = (): SessionFlagsService => {
  return {
    getFlagsForSession(symbol: string, sessionDate: string): SessionFlagsSummary {
      return aggregateFlags(SESSION_FLAGS_CONFIG, symbol, sessionDate);
    },
  };
};
