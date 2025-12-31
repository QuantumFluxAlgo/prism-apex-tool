import { randomUUID } from 'node:crypto';

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

import { createSessionFlagsService } from './session-metrics/session-flags-service.js';
import {
  fetchSessionMetricsBatch,
  sessionMetricsKeyToString,
  type SessionMetricsSummary,
} from './session-metrics/batch.js';

import {
  createOrrV3Engine,
  DEFAULT_ORR_V3_CONFIG,
} from '../strategy/orr/orr-v3.js';
import { makeSystemRecordStamps } from '../lib/systemRecordStamps.js';
import { insertOrrGateResult } from '../store/orrGateResults.js';

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

const sessionFlagsService = createSessionFlagsService();
const evaluateOrrGate = createOrrV3Engine(DEFAULT_ORR_V3_CONFIG);

function parseRiskCap(overrideCap?: number, envCap?: string): number | null {
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

function normalizeStrategyToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type CanonicalizedStrategy = {
  input: string;
  normalized: string;
  canonicalKey: 'orr' | 'osb' | 'vwap_ft' | 'unknown';
  ticketStrategyId: string;
  engineStrategyId: string;
};

function canonicalizeStrategyForSystemRecords(strategy: unknown): CanonicalizedStrategy {
  const input = typeof strategy === 'string' ? strategy : String(strategy ?? '');
  const normalized = normalizeStrategyToken(input);

  const orrAliases = new Set([
    'orr',
    'orr-v3',
    'orr_v3',
    'apx-ddb-01',
    'apx-ddb01',
    'apxddb01',
    'open-range-retest',
    'ddb',
  ]);

  if (orrAliases.has(normalized)) {
    return {
      input,
      normalized,
      canonicalKey: 'orr',
      ticketStrategyId: 'APX-DDB-01',
      engineStrategyId: 'ORR_V3',
    };
  }

  if (normalized === 'osb') {
    return {
      input,
      normalized,
      canonicalKey: 'osb',
      ticketStrategyId: 'OSB',
      engineStrategyId: 'OSB',
    };
  }

  if (normalized === 'vwap-ft' || normalized === 'vwap_ft' || normalized === 'vwapft') {
    return {
      input,
      normalized,
      canonicalKey: 'vwap_ft',
      ticketStrategyId: 'VWAP_FT',
      engineStrategyId: 'VWAP_FT',
    };
  }

  return {
    input,
    normalized,
    canonicalKey: 'unknown',
    ticketStrategyId: input || 'UNKNOWN',
    engineStrategyId: 'UNKNOWN',
  };
}

function truncateStack(stack: unknown, maxBytes = 32 * 1024): string | null {
  if (typeof stack !== 'string' || !stack.length) return null;
  const buffer = Buffer.from(stack, 'utf8');
  if (buffer.byteLength <= maxBytes) return stack;
  return buffer.subarray(0, maxBytes).toString('utf8');
}

async function writeOrrGateSystemRecord(args: {
  runId: string;
  symbol: string;
  sessionDate: string;
  strategyConfigVersion: number | null;
  strategyInput: string;
  strategyNormalized: string;
  meta?: Record<string, unknown>;
  previewError?: unknown;
}): Promise<void> {
  const {
    runId,
    symbol,
    sessionDate,
    strategyConfigVersion,
    strategyInput,
    strategyNormalized,
    meta,
    previewError,
  } = args;

  const flagsSummary = sessionFlagsService.getFlagsForSession(symbol, sessionDate);

  let sessionMetrics: SessionMetricsSummary = null;
  let sessionMetricsError: Record<string, unknown> | null = null;
  try {
    const summaryMap = await fetchSessionMetricsBatch([{ symbol, sessionDate }], { maxKeys: 1 });
    sessionMetrics = summaryMap.get(sessionMetricsKeyToString({ symbol, sessionDate })) ?? null;
  } catch (err: any) {
    sessionMetricsError = {
      name: err?.name ?? 'Error',
      message: err?.message ?? String(err),
      stack: truncateStack(err?.stack),
    };
  }

  const gateSignal = evaluateOrrGate({
    symbol,
    sessionDateUtc: sessionDate,
    metrics: sessionMetrics as any,
    flags: { hasNewsFlag: Boolean(flagsSummary?.hasNewsFlag) },
  });

  const actionable = gateSignal.type !== 'NO_TRADE';
  const reason = previewError ? 'ENGINE_PREVIEW_ERROR' : gateSignal.reason;

  const stamps = makeSystemRecordStamps({
    strategy: 'orr',
    strategyConfigVersion,
  });

  const details: Record<string, unknown> = {
    strategy_input: strategyInput,
    strategy_normalized: strategyNormalized,
    legacy_strategy_ids: ['APX-DDB-01'],
    operator_label: 'DDB',
    signal: gateSignal,
    meta: meta ?? null,
  };

  if (sessionMetricsError) {
    details.session_metrics_error = sessionMetricsError;
  }

  if (previewError) {
    const err: any = previewError;
    details.preview_error = {
      name: err?.name ?? 'Error',
      message: err?.message ?? String(err),
      stack: truncateStack(err?.stack),
    };
  }

  const metricsPayload: Record<string, unknown> = {
    sessionFlags: flagsSummary ?? null,
    sessionMetrics,
  };

  try {
    await insertOrrGateResult({
      run_id: runId,
      session_date: sessionDate,
      symbol,
      engine_strategy_id: 'ORR_V3',
      ticket_strategy_id: 'APX-DDB-01',
      canonical_strategy_key: 'orr',
      actionable,
      reason,
      metrics: metricsPayload,
      details,
      engine_version: stamps.engine_version,
      config_fingerprint: stamps.config_fingerprint,
      schema_version: stamps.schema_version,
      computed_at_utc: stamps.computed_at_utc,
    });
  } catch (err: any) {
    console.warn(
      JSON.stringify(
        {
          source: 'writeOrrGateSystemRecord',
          symbol,
          sessionDate,
          runId,
          note: 'insert failed (best-effort)',
          error: {
            name: err?.name ?? 'Error',
            message: err?.message ?? String(err),
            stack: truncateStack(err?.stack),
          },
        },
        null,
        2,
      ),
    );
  }
}

export async function runEngineSessionJob(params: EngineRunJobParams): Promise<EngineRunJobResult> {
  const { strategy, symbol, sessionDate, maxRiskDollarsPerTrade, meta } = params;

  const runId = randomUUID();
  const canon = canonicalizeStrategyForSystemRecords(strategy);
  const shouldWriteOrrGate = canon.canonicalKey === 'orr';

  const riskCap = parseRiskCap(maxRiskDollarsPerTrade, process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE);
  const risk: TicketRiskConfig = { maxRiskDollarsPerTrade: riskCap };

  const previewRequest: EnginePreviewRequest = {
    strategy,
    symbol,
    sessionDate,
  };

  let preview;
  try {
    preview = await runEnginePreview(previewRequest);
  } catch (err) {
    if (shouldWriteOrrGate) {
      await writeOrrGateSystemRecord({
        runId,
        symbol,
        sessionDate,
        strategyConfigVersion: null,
        strategyInput: canon.input,
        strategyNormalized: canon.normalized,
        meta,
        previewError: err,
      });
    }
    throw err;
  }

  const previewMeta = preview.meta ?? {};
  const signals: EngineSignal[] = preview.signals ?? [];
  const engineVersion = previewMeta.engineVersion ?? 'unknown-engine-version';
  const riskEngineVersion = previewMeta.riskEngineVersion ?? RISK_ENGINE_VERSION;
  const strategyConfigVersion = previewMeta.strategyConfigVersion ?? null;
  const safetyEnvelopeDropped =
    typeof previewMeta.safetyEnvelopeDropped === 'number' && previewMeta.safetyEnvelopeDropped > 0
      ? previewMeta.safetyEnvelopeDropped
      : 0;

  if (shouldWriteOrrGate) {
    await writeOrrGateSystemRecord({
      runId,
      symbol,
      sessionDate,
      strategyConfigVersion,
      strategyInput: canon.input,
      strategyNormalized: canon.normalized,
      meta,
    });
  }

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
      runId,
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
