import { randomUUID } from 'node:crypto';

import type { EnginePreviewRequest, EnginePreviewResponse } from '../dto/strategy-engine/index.js';
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
import { createSessionMetricsService } from './session-metrics/service.js';
import { getOrrConfig, getOrrGateResult } from '../lib/orrGate.js';
import { makeSystemRecordStamps } from '../lib/systemRecordStamps.js';
import {
  insertOrrGateResultWithClient,
  withOrrGateResultsClient,
} from '../store/orrGateResults.js';

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
const sessionMetricsService = createSessionMetricsService();
const PLANNER_STRATEGIES: EnginePreviewRequest['strategy'][] = ['orr', 'osb', 'vwapft'];
const ORR_GATE_CANONICAL_KEY = 'orr_gate';
const ORR_GATE_ENGINE_ID = 'ORR_GATE';

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

function summarizePreviewResult(
  strategyKey: string,
  preview: EnginePreviewResponse | null,
  error: unknown,
): Record<string, unknown> {
  if (error) {
    return {
      ok: false,
      strategy: strategyKey,
      error: {
        message: (error as any)?.message ?? String(error),
        stack: truncateStack((error as any)?.stack),
      },
    };
  }

  const meta = (preview as EnginePreviewResponse | null)?.meta ?? {};
  const signals = (preview as EnginePreviewResponse | null)?.signals ?? [];
  const first = Array.isArray(signals) && signals.length > 0 ? signals[0] : null;

  return {
    ok: true,
    strategy: strategyKey,
    engineVersion: meta.engineVersion ?? null,
    riskEngineVersion: meta.riskEngineVersion ?? null,
    strategyConfigVersion: meta.strategyConfigVersion ?? null,
    signalsCount: Array.isArray(signals) ? signals.length : 0,
    firstSignal: first
      ? {
          direction: first.direction ?? null,
          entryPrice: first.entryPrice ?? first.price ?? null,
          stopPrice: first.stopPrice ?? null,
          targetPrice: first.targetPrice ?? null,
          reason: first.reason ?? null,
        }
      : null,
  };
}

async function buildPlannerRollup(args: {
  symbol: string;
  sessionDate: string;
  requestedStrategy: EnginePreviewRequest['strategy'];
  requestedPreview: EnginePreviewResponse | null;
  requestedPreviewError: unknown;
}): Promise<Record<string, unknown>> {
  const rollup: Record<string, unknown> = {};
  const base = {
    symbol: args.symbol,
    sessionDate: args.sessionDate,
  } as const;

  for (const planner of PLANNER_STRATEGIES) {
    if (planner === args.requestedStrategy && args.requestedPreview) {
      rollup[planner] = summarizePreviewResult(planner, args.requestedPreview, null);
      continue;
    }

    try {
      const preview = await runEnginePreview({
        ...base,
        strategy: planner,
      });
      rollup[planner] = summarizePreviewResult(planner, preview, null);
    } catch (err) {
      const error =
        planner === args.requestedStrategy && args.requestedPreviewError ? args.requestedPreviewError : err;
      rollup[planner] = summarizePreviewResult(planner, null, error);
    }
  }

  return rollup;
}

async function writeOrrGateSystemRecord(args: {
  runId: string;
  symbol: string;
  sessionDate: string;
  requestedStrategy: EnginePreviewRequest['strategy'] | string;
  requestedStrategyConfigVersion: number | null;
  plannerRollup?: Record<string, unknown>;
  previewError?: unknown;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const gateConfig = getOrrConfig();
  const requested = canonicalizeStrategyForSystemRecords(args.requestedStrategy);
  const stamps = makeSystemRecordStamps({
    canonical_strategy_key: ORR_GATE_CANONICAL_KEY,
    engine_strategy_id: ORR_GATE_ENGINE_ID,
    ticket_strategy_id: requested.ticketStrategyId,
    requested_strategy: requested.input,
    requested_strategy_engine_id: requested.engineStrategyId,
    requested_strategy_ticket_id: requested.ticketStrategyId,
    requested_strategy_canonical_key: requested.canonicalKey,
    requested_strategy_config_version: args.requestedStrategyConfigVersion ?? null,
    gate_config: gateConfig,
  });

  try {
    await withOrrGateResultsClient(async (client) => {
      let gate: Awaited<ReturnType<typeof getOrrGateResult>> | null = null;
      let gateError: unknown = null;

      try {
        gate = await getOrrGateResult(client, args.symbol, args.sessionDate, gateConfig);
      } catch (err) {
        gateError = err;
      }

      const flagsSummary = sessionFlagsService.getFlagsForSession(args.symbol, args.sessionDate);

      let sessionMetricsSummary: SessionMetricsSummary | null = null;
      let sessionMetricsError: Record<string, unknown> | null = null;
      try {
        const key = sessionMetricsKeyToString({ symbol: args.symbol, sessionDate: args.sessionDate });
        const summaryMap = await fetchSessionMetricsBatch(
          [{ symbol: args.symbol, sessionDate: args.sessionDate }],
          { maxKeys: 1, service: sessionMetricsService },
        );
        sessionMetricsSummary = summaryMap.get(key) ?? null;
      } catch (err) {
        sessionMetricsError = {
          message: (err as any)?.message ?? String(err),
          stack: truncateStack((err as any)?.stack),
        };
      }

      const actionable = Boolean(gate?.actionable);
      const reason =
        typeof gate?.reason === 'string' && gate.reason.length
          ? gate.reason
          : actionable
            ? 'ok'
            : gateError
              ? 'gate-error'
              : 'gate-unavailable';

      const metrics = {
        gate: gate?.metrics ?? null,
      };

      const details: Record<string, unknown> = {
        kind: 'orr_gate_results',
        canonical_strategy_key: ORR_GATE_CANONICAL_KEY,
        engine_strategy_id: ORR_GATE_ENGINE_ID,
        ticket_strategy_id: requested.ticketStrategyId,
        requested_strategy_input: requested.input,
        requested_strategy_normalized: requested.normalized,
        requested_strategy_engine_id: requested.engineStrategyId,
        requested_strategy_ticket_id: requested.ticketStrategyId,
        requested_strategy_canonical_key: requested.canonicalKey,
        requested_strategy_config_version: args.requestedStrategyConfigVersion ?? null,
        gate_config: gateConfig,
        gate_result: gate ?? null,
        gate_error: gateError
          ? {
              message: (gateError as any)?.message ?? String(gateError),
              stack: truncateStack((gateError as any)?.stack),
            }
          : null,
        session_flags: flagsSummary,
        session_metrics_summary: sessionMetricsSummary,
        session_metrics_error: sessionMetricsError,
        planner_rollup: args.plannerRollup ?? {},
        requested_preview_error: args.previewError
          ? {
              message: (args.previewError as any)?.message ?? String(args.previewError),
              stack: truncateStack((args.previewError as any)?.stack),
            }
          : null,
        request_meta: args.meta ?? null,
      };

      await insertOrrGateResultWithClient(client, {
        run_id: args.runId,
        session_date: args.sessionDate,
        symbol: args.symbol,
        engine_strategy_id: ORR_GATE_ENGINE_ID,
        ticket_strategy_id: requested.ticketStrategyId,
        canonical_strategy_key: ORR_GATE_CANONICAL_KEY,
        actionable,
        reason,
        metrics,
        details,
        engine_version: stamps.engine_version,
        config_fingerprint: stamps.config_fingerprint,
        schema_version: stamps.schema_version,
        computed_at_utc: stamps.computed_at_utc,
      });
    });
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          source: 'writeOrrGateSystemRecord',
          symbol: args.symbol,
          sessionDate: args.sessionDate,
          runId: args.runId,
          note: 'failed to persist ORR gate system record (best-effort)',
          error: {
            message: (err as any)?.message ?? String(err),
            stack: truncateStack((err as any)?.stack),
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

  const riskCap = parseRiskCap(maxRiskDollarsPerTrade, process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE);
  const risk: TicketRiskConfig = { maxRiskDollarsPerTrade: riskCap };

  const previewRequest: EnginePreviewRequest = {
    strategy,
    symbol,
    sessionDate,
  };

  let preview: EnginePreviewResponse | null = null;
  try {
    preview = await runEnginePreview(previewRequest);
  } catch (err) {
    const plannerRollup = await buildPlannerRollup({
      symbol,
      sessionDate,
      requestedStrategy: strategy,
      requestedPreview: null,
      requestedPreviewError: err,
    });
    await writeOrrGateSystemRecord({
      runId,
      symbol,
      sessionDate,
      requestedStrategy: strategy,
      requestedStrategyConfigVersion: null,
      plannerRollup,
      previewError: err,
      meta,
    });
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

  const plannerRollup = await buildPlannerRollup({
    symbol,
    sessionDate,
    requestedStrategy: strategy,
    requestedPreview: preview,
    requestedPreviewError: null,
  });

  await writeOrrGateSystemRecord({
    runId,
    symbol,
    sessionDate,
    requestedStrategy: strategy,
    requestedStrategyConfigVersion: strategyConfigVersion,
    plannerRollup,
    previewError: null,
    meta,
  });

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
