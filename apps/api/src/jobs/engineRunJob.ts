import type { EnginePreviewRequest } from '../dto/strategy-engine/index.js';
import { runEnginePreview } from '../services/strategy-engine/index.js';
import {
  runEngineTicketsPipeline,
  type EngineTicketsRunContext,
} from '../services/tickets/engineTicketsOrchestrator.js';
import type { EngineSignal } from '../dto/strategy-engine/types.js';
import type { TicketRiskConfig } from '../services/tickets/engineTickets.js';
import { RISK_ENGINE_VERSION } from '../services/risk/version.js';
import { logGovernanceAlert } from '../services/governance/alert.js';

export interface EngineRunJobParams {
  strategy: EnginePreviewRequest['strategy'];
  symbol: string;
  sessionDate: string;
  maxRiskDollarsPerTrade?: number;
  meta?: Record<string, unknown>;
}

export interface EngineRunJobResult {
  strategy: EnginePreviewRequest['strategy'];
  symbol: string;
  sessionDate: string;
  engineVersion: string;
  riskEngineVersion: string;
  strategyConfigVersion: number | null;
  riskCap: number | null;
  signals: number;
  tickets: number;
  rejected: number;
  hardStopRejected: number;
  safetyEnvelopeDropped: number;
}

function parseRiskCap(
  overrideCap?: number,
  envCap?: string,
): number | null {
  if (typeof overrideCap === 'number' && Number.isFinite(overrideCap) && overrideCap > 0) {
    return overrideCap;
  }
  if (typeof envCap === 'string' && envCap.trim().length) {
    const parsed = Number(envCap.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export async function runEngineSessionJob(params: EngineRunJobParams): Promise<EngineRunJobResult> {
  const { strategy, symbol, sessionDate, maxRiskDollarsPerTrade, meta } = params;

  const riskCap = parseRiskCap(maxRiskDollarsPerTrade, process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE);
  const risk: TicketRiskConfig = { maxRiskDollarsPerTrade: riskCap };

  const previewRequest: EnginePreviewRequest = {
    strategy,
    symbol,
    sessionDate,
  };

  const preview = await runEnginePreview(previewRequest);
  const previewMeta = preview.meta ?? {};
  const signals: EngineSignal[] = preview.signals ?? [];
  const engineVersion = previewMeta.engineVersion ?? 'unknown-engine-version';
  const riskEngineVersion =
    previewMeta.riskEngineVersion ?? RISK_ENGINE_VERSION;
  const strategyConfigVersion =
    previewMeta.strategyConfigVersion ?? null;
  const safetyEnvelopeDropped =
    typeof previewMeta.safetyEnvelopeDropped === 'number' && previewMeta.safetyEnvelopeDropped > 0
      ? previewMeta.safetyEnvelopeDropped
      : 0;

  if (!signals.length) {
    const summary: EngineRunJobResult = {
      strategy,
      symbol,
      sessionDate,
      engineVersion,
      riskEngineVersion,
      strategyConfigVersion,
      riskCap,
      signals: 0,
      tickets: 0,
      rejected: 0,
      hardStopRejected: 0,
      safetyEnvelopeDropped,
    };
    console.log(
      JSON.stringify(
        {
          source: 'engineSessionJob',
          symbol,
          strategy,
          sessionDate,
          engineVersion,
          riskEngineVersion,
          strategyConfigVersion,
          riskCap,
          signals: 0,
          tickets: 0,
          rejected: 0,
          safetyEnvelopeDropped,
          note: 'No signals returned; skipping tickets pipeline',
        },
        null,
        2,
      ),
    );
    logGovernanceAlert('engine_run_summary', {
      strategy,
      symbol,
      sessionDate,
      safetyEnvelopeDropped,
      hardStopRejected: 0,
      signals: 0,
      tickets: 0,
      engineVersion,
      riskEngineVersion,
      strategyConfigVersion,
    });
    return summary;
  }

  const ticketsCtx: EngineTicketsRunContext = {
    symbol,
    strategy,
    sessionDate,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
    risk,
    signals,
    meta: {
      source: 'engineSessionJob',
      safetyEnvelopeDropped,
      ...(meta ?? {}),
    },
  };

  const result = await runEngineTicketsPipeline(ticketsCtx);
  const hardStopRejected = result.rejected.length;

  if (hardStopRejected > 0) {
    logGovernanceAlert('hard_stop_drops', {
      strategy,
      symbol,
      sessionDate,
      rejectedCount: hardStopRejected,
      engineVersion,
      riskEngineVersion,
      strategyConfigVersion,
    });
  }

  console.log(
    JSON.stringify(
      {
        source: 'engineSessionJob',
        symbol,
        strategy,
        sessionDate,
        engineVersion,
        riskEngineVersion,
        strategyConfigVersion,
        riskCap,
        signals: signals.length,
        tickets: result.tickets.length,
        rejected: result.rejected.length,
        safetyEnvelopeDropped,
      },
      null,
      2,
    ),
  );

  logGovernanceAlert('engine_run_summary', {
    strategy,
    symbol,
    sessionDate,
    safetyEnvelopeDropped,
    hardStopRejected,
    signals: signals.length,
    tickets: result.tickets.length,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
  });

  return {
    strategy,
    symbol,
    sessionDate,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
    riskCap,
    signals: signals.length,
    tickets: result.tickets.length,
    rejected: hardStopRejected,
    hardStopRejected,
    safetyEnvelopeDropped,
  };
}
