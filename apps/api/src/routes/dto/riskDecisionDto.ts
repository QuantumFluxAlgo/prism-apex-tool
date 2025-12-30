export type TicketRiskDecisionDto = {
  allowed: boolean;
  reason: string;
  codes: string[];
  maxContractsAllowed: number | null;
  warnings: string[];
};
