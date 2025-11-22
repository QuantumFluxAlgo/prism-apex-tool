export type TicketQualityFilterState = {
  minEntryRR?: number | '';
  maxEntryRR?: number | '';
  minActualRR?: number | '';
  maxActualRR?: number | '';
  minRiskDollars?: number | '';
  maxRiskDollars?: number | '';
  minActualPnLDollars?: number | '';
  maxActualPnLDollars?: number | '';
};

export type TicketQualityQueryParams = {
  [K in keyof TicketQualityFilterState]?: number;
};

