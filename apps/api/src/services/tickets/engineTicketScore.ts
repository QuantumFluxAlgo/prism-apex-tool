// apps/api/src/services/tickets/engineTicketScore.ts
/* PRISM APEX – Engine Ticket Score
 *
 * Server-side 0–100 ticket score + trend signal.
 *
 * Inputs (per row):
 * - rrMultiple / rr
 * - pnlRMultiple / pnlRatio
 * - contextRegime / contextAtrBucket
 * - riskDecision (allowed, warnings, codes)
 * - sessionMetrics (quality, regime) – optional
 *
 * Output:
 * - score: 0–100
 * - trend: "UP" | "FLAT" | "DOWN"
 */

import type { TicketRiskDecisionDto } from '../../routes/dto/riskDecisionDto.js';

export type EngineTicketScoreTrend = 'UP' | 'FLAT' | 'DOWN';

export interface EngineTicketScore {
  score: number;
  trend: EngineTicketScoreTrend;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function extractRiskDecision(row: any): TicketRiskDecisionDto | null {
  const decision = row?.riskDecision as TicketRiskDecisionDto | null | undefined;
  return decision ?? null;
}

function extractRrMultiple(row: any): number | null {
  const canonical = row?.canonicalApproved ?? row?.canonicalCandidate ?? null;

  if (canonical && typeof canonical.rrMultiple === 'number' && Number.isFinite(canonical.rrMultiple)) {
    return canonical.rrMultiple;
  }

  const rrMultiple =
    toNumber(row?.rrMultiple) ??
    toNumber(row?.rr_multiple) ??
    toNumber(row?.rr);

  return rrMultiple;
}

function extractPnlRMultiple(row: any): number | null {
  const canonical = row?.canonicalApproved ?? row?.canonicalCandidate ?? null;

  if (canonical && typeof canonical.pnlRMultiple === 'number' && Number.isFinite(canonical.pnlRMultiple)) {
    return canonical.pnlRMultiple;
  }

  const pnlR =
    toNumber(row?.pnlRMultiple) ??
    toNumber(row?.pnlRatio) ??
    toNumber(row?.pnl_r_multiple);

  return pnlR;
}

function extractContextRegime(row: any): string {
  const canonical = row?.canonicalApproved ?? row?.canonicalCandidate ?? null;
  const sessionMetrics = row?.sessionMetrics ?? null;

  const regime =
    canonical?.contextRegime ??
    row?.contextRegime ??
    sessionMetrics?.volRegime ??
    '';

  return typeof regime === 'string' ? regime.toLowerCase() : '';
}

function extractAtrBucket(row: any): string {
  const canonical = row?.canonicalApproved ?? row?.canonicalCandidate ?? null;
  const bucket =
    canonical?.contextAtrBucket ??
    row?.contextAtrBucket ??
    '';

  return typeof bucket === 'string' ? bucket.toLowerCase() : '';
}

function extractSessionQuality(row: any): string {
  const metrics = row?.sessionMetrics ?? null;
  const quality = metrics?.sessionQualityFlag ?? metrics?.sessionSkipReason ?? '';
  return typeof quality === 'string' ? quality.toLowerCase() : '';
}

/**
 * Compute the 0–100 score from a ticket row.
 */
export function computeEngineTicketScoreFromRow(row: any): EngineTicketScore {
  const rr = extractRrMultiple(row);
  const pnlR = extractPnlRMultiple(row);
  const regime = extractContextRegime(row);
  const atrBucket = extractAtrBucket(row);
  const sessionQuality = extractSessionQuality(row);
  const decision = extractRiskDecision(row);

  let score = 50;

  // RR contribution
  if (typeof rr === 'number' && Number.isFinite(rr)) {
    if (rr >= 2.0) score += 20;
    else if (rr >= 1.5) score += 14;
    else if (rr >= 1.0) score += 8;
    else if (rr >= 0.7) score += 3;
    else if (rr < 0.5) score -= 6;
  }

  // Regime + ATR bucket
  if (regime.includes('trend')) score += 4;
  if (regime.includes('range')) score += 2;

  if (atrBucket.includes('medium') || atrBucket.includes('normal')) score += 3;
  if (atrBucket.includes('high')) score += 5;
  if (atrBucket.includes('ultra')) score -= 4;

  // Session quality
  if (sessionQuality.includes('skip') || sessionQuality.includes('avoid')) {
    score -= 10;
  } else if (sessionQuality.includes('good')) {
    score += 5;
  } else if (sessionQuality.includes('ok') || sessionQuality.includes('neutral')) {
    score += 1;
  }

  // Risk decision impact
  if (decision) {
    const allowed = !!decision.allowed;
    const codes = Array.isArray(decision.codes)
      ? decision.codes.map((c) => String(c).toUpperCase())
      : [];
    const warnings = Array.isArray(decision.warnings) ? decision.warnings : [];

    const hasBlockCode = codes.some((c) => c.includes('BLOCK') || c.includes('DENY'));
    const hasWarnCode = codes.some((c) => c.includes('WARN') || c.includes('RISK'));

    if (!allowed || hasBlockCode) score -= 20;
    if (warnings.length > 0 || hasWarnCode) score -= 5;
  }

  // Realized PnL R-multiple impact
  if (typeof pnlR === 'number' && Number.isFinite(pnlR)) {
    if (pnlR > 1.0) score += 6;
    else if (pnlR > 0.3) score += 3;
    else if (pnlR < -1.0) score -= 6;
    else if (pnlR < -0.3) score -= 3;
  }

  const clamped = clampScore(score);

  // Trend is a qualitative health indicator – we reuse RR / pnlR / risk decision.
  let trend: EngineTicketScoreTrend = 'FLAT';

  if (decision && !decision.allowed) {
    trend = 'DOWN';
  } else if (typeof pnlR === 'number' && Number.isFinite(pnlR)) {
    if (pnlR > 0.8) trend = 'UP';
    else if (pnlR < -0.8) trend = 'DOWN';
  } else if (typeof rr === 'number' && Number.isFinite(rr)) {
    if (rr >= 2.0) trend = 'UP';
    else if (rr < 0.7) trend = 'DOWN';
  }

  return {
    score: clamped,
    trend,
  };
}

