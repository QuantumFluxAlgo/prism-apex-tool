import type { TicketQualityFilterState, TicketQualityQueryParams } from '../types/ticketQualityFilters.js';

export function buildTicketQualityQuery(filters: TicketQualityFilterState): TicketQualityQueryParams {
  const query: TicketQualityQueryParams = {};

  for (const [key, val] of Object.entries(filters) as Array<[keyof TicketQualityFilterState, number | '' | undefined]>) {
    if (val === '' || val === undefined || val === null) continue;
    const numeric = typeof val === 'number' ? val : Number(val);
    if (Number.isFinite(numeric)) {
      query[key] = numeric;
    }
  }

  return query;
}

