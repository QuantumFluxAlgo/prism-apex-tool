import { exportTickets, type Ticket } from '../store/tickets.js';
import { getOperatorConfig } from '../store/operatorConfig.js';
import type { DailyRiskSnapshotDto } from '../routes/dto/operatorRisk.js';
import { computeRiskSizing, type RiskSizingResult } from './riskSizing.js';

export type DailyRiskSnapshotParams = {
  dateUtc?: string;
};

function normalizeDate(date?: string): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function computeRealisedPnL(ticket: Ticket): number {
  const perContract = ticket.accepted ? ticket.target - ticket.entry : ticket.stop - ticket.entry;
  return perContract * (ticket.qty ?? 0);
}

function computeOpenRisk(ticket: Ticket): number {
  if (!ticket.accepted) return 0;
  const perContractRisk = Math.abs(ticket.entry - ticket.stop);
  return perContractRisk * (ticket.qty ?? 0);
}

export async function getDailyRiskSnapshot(params: DailyRiskSnapshotParams = {}): Promise<DailyRiskSnapshotDto> {
  const dateUtc = normalizeDate(params.dateUtc);
  const [operatorConfig, tickets] = await Promise.all([getOperatorConfig(), exportTickets(dateUtc)]);

  const realisedPnL = tickets.reduce((sum, ticket) => sum + computeRealisedPnL(ticket), 0);
  const openRisk = tickets.reduce((sum, ticket) => sum + computeOpenRisk(ticket), 0);

  const maxDailyLossAmount =
    operatorConfig.dailyStartingBalance !== null && operatorConfig.maxDailyDrawdownPct !== null
      ? (operatorConfig.dailyStartingBalance * operatorConfig.maxDailyDrawdownPct) / 100
      : null;
  const drawdownAmount = Math.max(0, -realisedPnL);
  const remainingRiskCapacity =
    maxDailyLossAmount !== null ? Math.max(0, maxDailyLossAmount - drawdownAmount - openRisk) : null;
  const isLockedOut =
    remainingRiskCapacity !== null && maxDailyLossAmount !== null ? remainingRiskCapacity <= 0 : null;

  return {
    dateUtc,
    dailyStartingBalance: operatorConfig.dailyStartingBalance,
    maxDailyDrawdownPct: operatorConfig.maxDailyDrawdownPct,
    maxDailyLossAmount,
    realisedPnL,
    openRisk,
    drawdownAmount,
    remainingRiskCapacity,
    isLockedOut,
  };
}

export type NextTradeSizingParams = {
  dateUtc: string;
  perContractRisk: number;
  minContracts?: number;
  maxContractsCap?: number;
  riskFractionPerTrade?: number;
};

export type NextTradeSizingResult = {
  snapshot: DailyRiskSnapshotDto;
  sizing: RiskSizingResult;
};

export async function computeNextTradeSizingForDate(
  params: NextTradeSizingParams,
): Promise<NextTradeSizingResult> {
  const dateUtc = normalizeDate(params.dateUtc);
  const snapshot = await getDailyRiskSnapshot({ dateUtc });
  const sizing = computeRiskSizing({
    snapshot: {
      dailyStartingBalance: snapshot.dailyStartingBalance,
      maxDailyDrawdownPct: snapshot.maxDailyDrawdownPct,
      maxDailyLossAmount: snapshot.maxDailyLossAmount,
      realisedPnL: snapshot.realisedPnL,
      openRisk: snapshot.openRisk,
      remainingRiskCapacity: snapshot.remainingRiskCapacity,
    },
    perContractRisk: params.perContractRisk,
    minContracts: params.minContracts,
    maxContractsCap: params.maxContractsCap,
    riskFractionPerTrade: params.riskFractionPerTrade,
  });
  return { snapshot, sizing };
}

export async function shouldBlockNewTicketsForDay(dateUtc: string): Promise<boolean> {
  const snapshot = await getDailyRiskSnapshot({ dateUtc });
  if (snapshot.dailyStartingBalance === null || snapshot.maxDailyDrawdownPct === null) {
    console.info(`[operatorRisk] Risk config not set for ${dateUtc}; allowing tickets.`);
    return false;
  }
  return snapshot.isLockedOut === true;
}
