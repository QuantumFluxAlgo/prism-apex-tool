import { logger } from '../../observability/logger.js';
import { logGovernanceAlert } from '../governance/alert.js';
import type { TicketQualityFilters } from '../../routes/ticketQualityFilters.js';

export interface TicketQualityTelemetryContext {
  route: 'tickets' | 'tickets-debug';
  filters: TicketQualityFilters;
  totalBefore: number;
  totalAfter: number;
  symbol?: string;
  direction?: string;
  status?: string;
}

export function emitTicketQualityTelemetry(ctx: TicketQualityTelemetryContext): void {
  const {
    route,
    filters,
    totalBefore,
    totalAfter,
    symbol,
    direction,
    status,
  } = ctx;

  const filteredOut = Math.max(totalBefore - totalAfter, 0);
  const payload = {
    route,
    filters,
    totals: {
      before: totalBefore,
      after: totalAfter,
      filteredOut,
    },
    scope: {
      symbol: symbol ?? null,
      direction: direction ?? null,
      status: status ?? null,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    logger.warn({
      type: 'tickets_quality_summary',
      ...payload,
    });
  } catch {
    // logging must never break API
  }

  try {
    logGovernanceAlert('tickets_quality_summary', payload);
  } catch {
    // governance alerts are best-effort
  }
}
