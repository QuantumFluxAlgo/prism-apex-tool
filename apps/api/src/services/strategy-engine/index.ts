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

export const ENGINE_VERSION = '0.5.0-orr-osb-vwapft';

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
    signals: approvedSignals,
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
