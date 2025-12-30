import { describe, expect, it, vi } from 'vitest';
import { emitTicketQualityTelemetry } from '../services/tickets/ticketsTelemetry.js';
import * as governance from '../services/governance/alert.js';
import { logger } from '../observability/logger.js';

describe('emitTicketQualityTelemetry', () => {
  it('logs telemetry and governance alerts without throwing', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const alertSpy = vi.spyOn(governance, 'logGovernanceAlert').mockImplementation(() => {});

    expect(() =>
      emitTicketQualityTelemetry({
        route: 'tickets',
        filters: { minEntryRR: 1, maxEntryRR: 2 },
        totalBefore: 10,
        totalAfter: 4,
        symbol: 'ES',
        direction: 'LONG',
        status: 'COMPLETE',
      }),
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tickets_quality_summary',
        route: 'tickets',
      }),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'tickets_quality_summary',
      expect.objectContaining({
        route: 'tickets',
        totals: expect.objectContaining({ before: 10, after: 4, filteredOut: 6 }),
      }),
    );
  });
});
