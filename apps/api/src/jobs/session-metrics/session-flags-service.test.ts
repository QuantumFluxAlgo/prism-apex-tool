import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SESSION_FLAGS_CONFIG,
  SessionFlag,
  type SessionFlagConfigEntry,
} from '../../config/session-flags.js';
import { createSessionFlagsService } from './session-flags-service.js';

const cloneConfigEntries = (entries: SessionFlagConfigEntry[]): SessionFlagConfigEntry[] =>
  entries.map((entry) => ({
    symbolPattern: entry.symbolPattern,
    sessionDate: entry.sessionDate,
    flags: [...entry.flags],
    note: entry.note,
  }));

describe('SessionFlagsService', () => {
  let originalConfig: SessionFlagConfigEntry[];

  beforeEach(() => {
    originalConfig = cloneConfigEntries(SESSION_FLAGS_CONFIG);
    SESSION_FLAGS_CONFIG.length = 0;
  });

  afterEach(() => {
    SESSION_FLAGS_CONFIG.length = 0;
    SESSION_FLAGS_CONFIG.push(...originalConfig);
  });

  it('returns empty flags when no config entries match', () => {
    const service = createSessionFlagsService();

    const result = service.getFlagsForSession('ESZ5', '2025-11-15');

    expect(result.flags).toEqual([]);
    expect(result.hasNewsFlag).toBe(false);
  });

  it('aggregates flags for matching symbol/date and sets hasNewsFlag when NEWS/FOMC present', () => {
    const service = createSessionFlagsService();

    SESSION_FLAGS_CONFIG.push(
      {
        symbolPattern: 'ES*',
        sessionDate: '2025-11-15',
        flags: [SessionFlag.NEWS],
      },
      {
        symbolPattern: 'ESZ5',
        sessionDate: '2025-11-15',
        flags: [SessionFlag.OTHER],
      },
      {
        symbolPattern: 'NQ*',
        sessionDate: '2025-11-15',
        flags: [SessionFlag.FOMC],
      },
    );

    const result = service.getFlagsForSession('ESZ5', '2025-11-15');

    expect(result.flags).toEqual(
      expect.arrayContaining([SessionFlag.NEWS, SessionFlag.OTHER]),
    );
    expect(result.flags).not.toEqual([]);
    expect(result.hasNewsFlag).toBe(true);
  });
});
