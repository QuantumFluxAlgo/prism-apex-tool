import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import {
  buildTicketsFromSignals,
  type TicketBuildContext,
  type TicketBuildResult,
  type TicketRiskConfig,
} from './engineTickets.js';
import {
  persistEngineTickets,
  type EngineTicketPersistContext,
} from './engineTicketsStore.js';

export interface EngineTicketsRunContext {
  symbol: string;
  strategy: string;
  sessionDate: string;
  engineVersion: string;
  riskEngineVersion: string;
  strategyConfigVersion: number | null;
  risk: TicketRiskConfig;
  signals: EngineSignal[];
  meta?: Record<string, unknown>;
}

export async function runEngineTicketsPipeline(ctx: EngineTicketsRunContext): Promise<TicketBuildResult> {
  const {
    symbol,
    strategy,
    sessionDate,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
    risk,
    signals,
    meta,
  } = ctx;

  if (!signals.length) {
    return { tickets: [], rejected: [] };
  }

  const ticketCtx: TicketBuildContext = {
    symbol,
    strategy,
    signals,
    risk,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
  };

  const result: TicketBuildResult = buildTicketsFromSignals(ticketCtx);

  const persistCtx: EngineTicketPersistContext = {
    symbol,
    strategy,
    sessionDate,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
    tickets: result.tickets,
    rejected: result.rejected,
    meta,
  };

  await persistEngineTickets(persistCtx);

  return result;
}
