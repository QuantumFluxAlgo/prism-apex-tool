import type { StrategyKey } from './types.js';

export interface StrategyConfigAuditEntryDto {
  auditId: number;
  strategy: StrategyKey;
  version: number;
  previousVersion: number | null;
  operator: string | null;
  createdAt: string;
  params: unknown;
  diff: unknown;
}
