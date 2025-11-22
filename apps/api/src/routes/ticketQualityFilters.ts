export interface TicketQualityFilters {
  minEntryRR?: number | null;
  maxEntryRR?: number | null;
  minActualRR?: number | null;
  maxActualRR?: number | null;
  minRiskDollars?: number | null;
  maxRiskDollars?: number | null;
  minActualPnLDollars?: number | null;
  maxActualPnLDollars?: number | null;
  [key: string]: number | null | undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseTicketQualityFilters(
  query: Partial<Record<string, unknown>>,
): TicketQualityFilters {
  return {
    minEntryRR: toNumber(query.minEntryRR),
    maxEntryRR: toNumber(query.maxEntryRR),
    minActualRR: toNumber(query.minActualRR),
    maxActualRR: toNumber(query.maxActualRR),
    minRiskDollars: toNumber(query.minRiskDollars),
    maxRiskDollars: toNumber(query.maxRiskDollars),
    minActualPnLDollars: toNumber(query.minActualPnLDollars),
    maxActualPnLDollars: toNumber(query.maxActualPnLDollars),
  };
}

export interface TicketQualityRow {
  rrMultiple?: number | null;
  rr?: number | null;
  riskDollars?: number | null;
  rewardDollars?: number | null;
  actualPnLDollars?: number | null;
  pnl?: number | null;
  meta?: Record<string, unknown> | null;
}

export function applyQualityFilters<T extends TicketQualityRow>(
  tickets: T[],
  filters: TicketQualityFilters,
): T[] {
  const hasFilter = Object.values(filters).some((value) => typeof value === 'number' && !Number.isNaN(value));
  if (!hasFilter) {
    return tickets;
  }

  return tickets.filter((ticket) => {
    const entryRR = getEntryRR(ticket);
    if (filters.minEntryRR != null && (entryRR == null || entryRR < filters.minEntryRR)) {
      return false;
    }
    if (filters.maxEntryRR != null && (entryRR == null || entryRR > filters.maxEntryRR)) {
      return false;
    }

    const actualRR = getActualRR(ticket);
    if (filters.minActualRR != null && (actualRR == null || actualRR < filters.minActualRR)) {
      return false;
    }
    if (filters.maxActualRR != null && (actualRR == null || actualRR > filters.maxActualRR)) {
      return false;
    }

    const risk = getRiskDollars(ticket);
    if (filters.minRiskDollars != null && (risk == null || risk < filters.minRiskDollars)) {
      return false;
    }
    if (filters.maxRiskDollars != null && (risk == null || risk > filters.maxRiskDollars)) {
      return false;
    }

    const actualPnl = getActualPnL(ticket);
    if (filters.minActualPnLDollars != null && (actualPnl == null || actualPnl < filters.minActualPnLDollars)) {
      return false;
    }
    if (filters.maxActualPnLDollars != null && (actualPnl == null || actualPnl > filters.maxActualPnLDollars)) {
      return false;
    }

    return true;
  });
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getEntryRR(ticket: TicketQualityRow): number | null {
  return (
    safeNumber(ticket.rrMultiple) ??
    safeNumber((ticket.meta as any)?.rrMultiple) ??
    safeNumber(ticket.rr) ??
    null
  );
}

function getRiskDollars(ticket: TicketQualityRow): number | null {
  return (
    safeNumber(ticket.riskDollars) ??
    safeNumber((ticket.meta as any)?.riskDollars) ??
    safeNumber((ticket as any).risk_dollars) ??
    null
  );
}

function getActualPnL(ticket: TicketQualityRow): number | null {
  return (
    safeNumber((ticket as any).actualPnLDollars) ??
    safeNumber((ticket.meta as any)?.actualPnLDollars) ??
    safeNumber((ticket as any).pnl) ??
    null
  );
}

function getActualRR(ticket: TicketQualityRow): number | null {
  const explicit =
    safeNumber((ticket as any).actualRRMultiple) ??
    safeNumber((ticket.meta as any)?.actualRRMultiple);
  if (explicit != null) {
    return explicit;
  }
  const pnl = getActualPnL(ticket);
  const risk = getRiskDollars(ticket);
  if (pnl == null || risk == null || risk === 0) {
    return null;
  }
  return pnl / risk;
}
