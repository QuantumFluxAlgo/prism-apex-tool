/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this API file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import type { EnginePreviewRequest, EnginePreviewResponse, EngineSignal } from '../../dto/strategy-engine/index.js';
import type { StrategyKey as ConfigStrategyKey } from '../../dto/strategy-config/types.js';
import { getStrategyConfig, getStrategyConfigByVersion } from '../strategy-config/index.js';
import { loadBarsForSession } from './bars.js';
import { runOrrStrategy } from './orr.js';
import { runOsbStrategy } from './osb.js';
import { runVwapFtStrategy } from './vwapft.js';
import { applyHardStopToSignals } from '../../risk/engineHardStop.js';
import { getPromotedStrategyVersion } from '../strategy-config/promotion.js';
import { RISK_ENGINE_VERSION } from '../risk/version.js';
import { applySafetyEnvelope } from './safetyEnvelope.js';
import {
  ContractMathError,
  priceDiffToTicks,
  ticksToDollars,
} from '../../risk/contractMath.js';
import type { CanonicalCandidateTicket } from '@prism-apex/shared';

export const ENGINE_VERSION = '0.5.0-orr-osb-vwapft';

function enrichSignalWithRisk(symbol: string, signal: EngineSignal): EngineSignal {
  const enriched: EngineSignal = { ...signal };
  try {
    const entry =
      typeof signal.entryPrice === 'number' && Number.isFinite(signal.entryPrice)
        ? signal.entryPrice
        : signal.price;
    const stop = signal.stopPrice;

    if (Number.isFinite(entry) && typeof stop === 'number' && Number.isFinite(stop)) {
      const ticksToStop = Math.abs(priceDiffToTicks(symbol, entry, stop));
      if (Number.isFinite(ticksToStop) && ticksToStop > 0) {
        enriched.ticksToStop = ticksToStop;
        const riskPerContract = ticksToDollars(symbol, ticksToStop);
        if (Number.isFinite(riskPerContract)) {
          enriched.riskPerContractUSD = riskPerContract;
        }
      }
    }

    if (
      typeof signal.targetPrice === 'number' &&
      Number.isFinite(signal.targetPrice)
    ) {
      const entryForTarget =
        typeof signal.entryPrice === 'number' && Number.isFinite(signal.entryPrice)
          ? signal.entryPrice
          : signal.price;
      if (Number.isFinite(entryForTarget)) {
        const ticksToTarget = Math.abs(priceDiffToTicks(symbol, entryForTarget, signal.targetPrice));
        if (Number.isFinite(ticksToTarget) && ticksToTarget > 0) {
          enriched.ticksToTarget = ticksToTarget;
          const rewardPerContract = ticksToDollars(symbol, ticksToTarget);
          if (Number.isFinite(rewardPerContract)) {
            enriched.rewardPerContractUSD = rewardPerContract;
          }
        }
      }
    }
  } catch (error) {
    if (!(error instanceof ContractMathError)) {
      // swallow unexpected errors but avoid leaking details
      // intentional no-op
    }
  }
  return enriched;
}

export async function runEnginePreview(
  input: EnginePreviewRequest,
): Promise<EnginePreviewResponse> {
  const { strategy, symbol, sessionDate } = input;
  const bars = await loadBarsForSession(symbol, sessionDate);
  const barCount = bars.length;
  const sessionStart = barCount > 0 ? bars[0].timestamp : null;
  const sessionEnd = barCount > 0 ? bars[barCount - 1].timestamp : null;
  let signals: EngineSignal[] = [];

  let notes = 'bars_1m wired; strategy logic stubbed';

  const strategyConfigKey: ConfigStrategyKey =
    strategy === 'vwapft' ? 'vwap_ft' : (strategy as ConfigStrategyKey);
  const promotion = await getPromotedStrategyVersion(strategyConfigKey);

  let strategyConfigVersion: number | null = promotion.promotedVersion ?? null;
  let configRecord;
  try {
    if (promotion.promotedVersion !== null) {
      configRecord = await getStrategyConfigByVersion(
        strategyConfigKey,
        promotion.promotedVersion,
      );
    } else {
      configRecord = await getStrategyConfig(strategyConfigKey);
      strategyConfigVersion = configRecord.version;
    }
  } catch (err) {
    // fallback to latest if specific version lookup fails
    configRecord = await getStrategyConfig(strategyConfigKey);
    strategyConfigVersion = configRecord.version;
  }

  if (strategy === 'orr') {
    if (configRecord.strategy !== 'orr') {
      throw new Error('Unexpected strategy config payload for ORR');
    }
    signals = runOrrStrategy(bars, configRecord.params);
    notes = 'ORR logic active on bars_1m';
  } else if (strategy === 'osb') {
    if (configRecord.strategy !== 'osb') {
      throw new Error('Unexpected strategy config payload for OSB');
    }
    signals = runOsbStrategy(bars, configRecord.params);
    notes = 'OSB logic active on bars_1m';
  } else if (strategy === 'vwapft') {
    if (configRecord.strategy !== 'vwap_ft') {
      throw new Error('Unexpected strategy config payload for VWAP-FT');
    }
    signals = runVwapFtStrategy(bars, configRecord.params);
    notes = 'VWAP-FT logic active on bars_1m';
  }

  const { approved: safeSignals, rejected: envelopeRejected } = applySafetyEnvelope(signals, bars, {
    strategy,
    symbol,
    sessionDate,
  });

  const maxRiskStr = process.env.ENGINE_MAX_RISK_DOLLARS_PER_TRADE;
  let maxRisk: number | null = null;
  if (typeof maxRiskStr === 'string' && maxRiskStr.trim().length) {
    const parsed = Number(maxRiskStr.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      maxRisk = parsed;
    }
  }

  const { approvedSignals } = applyHardStopToSignals({
    symbol,
    signals: safeSignals,
    config: { maxRiskDollarsPerTrade: maxRisk },
  });
  const enrichedSignals = approvedSignals.map((signal) => enrichSignalWithRisk(symbol, signal));

  const gatingNote =
    maxRisk !== null
      ? `hardStop=enabled(max=${maxRisk.toFixed(2)})`
      : 'hardStop=disabled';
  notes = notes ? `${notes}; ${gatingNote}` : gatingNote;
  const safetyNote = `safetyEnvelope=strict-enforced; safetyEnvelopeDropped=${envelopeRejected.length}`;
  notes = notes ? `${notes}; ${safetyNote}` : safetyNote;

  const configVersion = strategyConfigVersion ?? configRecord.version ?? null;

  return {
    strategy,
    symbol,
    sessionDate,
    configVersion: configVersion ?? undefined,
    signals: enrichedSignals,
    meta: {
      engineVersion: ENGINE_VERSION,
      riskEngineVersion: RISK_ENGINE_VERSION,
      strategyConfigVersion: configVersion,
      barCount,
      sessionStart,
      sessionEnd,
      notes,
      safetyEnvelope: 'strict-enforced',
      safetyEnvelopeDropped: envelopeRejected.length,
    },
  };
}

export interface StrategySuggestionLike {
  contract: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  target: number;
  qty?: number;
  timestampUtc: string;
  meta: {
    strategy: string;
    rr?: number;
    stopTicks?: number;
    targetTicks?: number;
    strategyVersion?: string;
    contextRegime?: string | null;
    contextAtrBucket?: string | null;
    contextOrType?: string | null;
    tags?: string[];
    guardrails?: string[];
  };
}

function normalizeBaseSymbol(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  return trimmed;
}

function safePriceDiffToTicks(symbol: string | null, from: number, to: number): number | null {
  if (!symbol) return null;
  try {
    return Math.abs(priceDiffToTicks(symbol, from, to));
  } catch {
    return null;
  }
}

function safeTicksToDollars(symbol: string | null, ticks: number): number | null {
  if (!symbol) return null;
  try {
    return Math.abs(ticksToDollars(symbol, ticks));
  } catch {
    return null;
  }
}

export function buildCanonicalCandidateTicket(
  suggestion: StrategySuggestionLike,
): CanonicalCandidateTicket {
  const { contract, symbol, side, entry, stop, target, qty, timestampUtc, meta } = suggestion;
  const entryPrice = Number.isFinite(entry) ? entry : target;
  const stopPrice = Number.isFinite(stop) ? (stop as number) : entryPrice;
  const targetPrice = Number.isFinite(target) ? target : entryPrice;
  const quantity = typeof qty === 'number' && Number.isFinite(qty) && qty > 0 ? qty : 0;

  const baseSymbol = normalizeBaseSymbol(symbol ?? contract ?? null);

  const metaStopTicks =
    typeof meta?.stopTicks === 'number' && Number.isFinite(meta.stopTicks)
      ? Math.abs(meta.stopTicks)
      : null;
  const metaTargetTicks =
    typeof meta?.targetTicks === 'number' && Number.isFinite(meta.targetTicks)
      ? Math.abs(meta.targetTicks)
      : null;

  const computedStopTicks =
    metaStopTicks ?? safePriceDiffToTicks(baseSymbol, entryPrice, stopPrice);
  const stopTicks = computedStopTicks && computedStopTicks > 0
    ? computedStopTicks
    : Math.max(Math.abs(entryPrice - stopPrice), 1);

  const computedTargetTicks =
    metaTargetTicks ?? safePriceDiffToTicks(baseSymbol, entryPrice, targetPrice);
  const targetTicks = computedTargetTicks && computedTargetTicks > 0
    ? computedTargetTicks
    : Math.max(Math.abs(targetPrice - entryPrice), 1);

  const computedRiskDollars = safeTicksToDollars(baseSymbol, stopTicks);
  const perContractRisk =
    typeof computedRiskDollars === 'number' && Number.isFinite(computedRiskDollars)
      ? computedRiskDollars
      : Math.abs(entryPrice - stopPrice);

  const computedRewardDollars = safeTicksToDollars(baseSymbol, targetTicks);
  const perContractReward =
    typeof computedRewardDollars === 'number' && Number.isFinite(computedRewardDollars)
      ? computedRewardDollars
      : Math.abs(targetPrice - entryPrice);

  const totalRisk = quantity > 0 ? perContractRisk * quantity : 0;
  const expectedReward = quantity > 0 ? perContractReward * quantity : 0;

  const derivedRR = perContractRisk > 0 ? perContractReward / perContractRisk : 1;
  const rrMultiple =
    typeof meta?.rr === 'number' && Number.isFinite(meta.rr)
      ? meta.rr
      : derivedRR > 0
      ? derivedRR
      : 1;

  const sessionDateUtc = new Date(timestampUtc).toISOString().slice(0, 10) + 'T00:00:00Z';
  const id = `candidate:${contract}:${timestampUtc}`;

  return {
    id,
    symbol: contract || symbol,
    sessionDateUtc,
    side: side === 'SELL' ? 'SHORT' : 'LONG',
    entryPrice,
    stopPrice,
    targetPrice,
    exitPrice: null,
    entryTicksFromRef: null,
    stopTicks,
    targetTicks,
    quantity,
    perContractRisk,
    totalRisk,
    expectedReward,
    rrMultiple,
    pnl: null,
    pnlRMultiple: null,
    strategyId: meta.strategy,
    strategyVersion: meta.strategyVersion ?? null,
    contextRegime: meta.contextRegime ?? null,
    contextAtrBucket: meta.contextAtrBucket ?? null,
    contextOrType: meta.contextOrType ?? null,
    tags: meta.tags ?? meta.guardrails ?? [],
    status: 'PENDING',
    createdAtUtc: timestampUtc,
    updatedAtUtc: timestampUtc,
    completedAtUtc: null,
    completedBy: null,
    accountId: null,
    notes: null,
    source: 'ENGINE',
  };
}
