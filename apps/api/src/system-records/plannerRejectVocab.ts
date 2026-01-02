/**
 * P1 System Records – Planner Reject Vocabulary (engineering-only)
 *
 * Goal:
 *   Prevent "reason string soup" from polluting analytics by forcing all rejection
 *   counting to a stable vocabulary.
 *
 * Key ideas:
 *   - PlannerKey is the business-facing planner identifier: vwap_ft | osb | ddb
 *   - requested_planner is "what the run asked for"
 *   - rejecting_planner is "which planner's candidate got dropped"
 *   - reject_stage identifies WHERE the drop happened (planner vs downstream envelope)
 *   - reason_code is a stable bucket (coarse, durable)
 */

export const plannerKeys = ['vwap_ft', 'osb', 'ddb'] as const;
export type PlannerKey = (typeof plannerKeys)[number];

export const rejectStages = [
  'PLANNER',
  'SAFETY',
  'RISK',
  'PERSISTENCE',
  'TICKETIZER',
] as const;
export type RejectStage = (typeof rejectStages)[number];

export const plannerRejectReasonCodes = [
  // Planner-stage buckets
  'NO_SETUP',
  'MISSING_SESSION_METRICS',
  'NEWS_SESSION_BLOCKED',
  'OR_ATR_OUT_OF_RANGE',
  'OR_TOO_NARROW',
  'VWAP_SLOPE_BLOCKED',

  // Downstream buckets
  'SAFETY_ENVELOPE_REJECTED',
  'RISK_ENGINE_REJECTED',
  'PERSISTENCE_FAILED',
  'TICKETIZER_REJECTED',

  // Catch-all
  'OTHER',
] as const;
export type PlannerRejectReasonCode = (typeof plannerRejectReasonCodes)[number];

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

/**
 * Canonicalize strategy/planner tokens into PlannerKey.
 *
 * We intentionally keep this local (not reusing the HTTP plugin) so that
 * internal jobs/stores can normalize without needing Fastify context.
 */
export function canonicalizePlannerKey(raw: string): PlannerKey | null {
  const t = normalizeToken(raw);

  // VWAP variants
  if (t === 'vwap' || t === 'vwap-ft' || t === 'vwapft' || t === 'vwap_ft') return 'vwap_ft';

  // OSB variants
  if (t === 'osb' || t === 'openingrangebreakout' || t === 'opening-range-breakout') return 'osb';

  // DDB variants (legacy ORR naming)
  if (
    t === 'ddb' ||
    t === 'apx-ddb-01' ||
    t === 'apx_ddb_01' ||
    t === 'apxddb01' ||
    t === 'open-range-retest' ||
    t === 'opening-range-retest' ||
    t === 'orr'
  ) {
    return 'ddb';
  }

  return null;
}

export function requirePlannerKey(raw: string, label: string): PlannerKey {
  const k = canonicalizePlannerKey(raw);
  if (!k) throw new Error(`Invalid ${label} planner token: ${raw}`);
  return k;
}

/**
 * Map raw reason strings into stable enum buckets.
 *
 * Strategy:
 *   - For non-PLANNER stages: bucket by stage (durable coarse categories).
 *   - For PLANNER stage: attempt to map known ORR/OSB/VWAP reasons into stable buckets.
 *   - Unknowns always go to OTHER (never throw).
 */
export function mapRawReasonToPlannerRejectCode(input: {
  rejectStage: RejectStage;
  rawReason?: string | null;
}): PlannerRejectReasonCode {
  const stage = input.rejectStage;
  const raw = (input.rawReason ?? '').toString().trim();
  const u = raw.toUpperCase();

  // Downstream stage rollups (keep stable)
  if (stage === 'SAFETY') return 'SAFETY_ENVELOPE_REJECTED';
  if (stage === 'RISK') return 'RISK_ENGINE_REJECTED';
  if (stage === 'PERSISTENCE') return 'PERSISTENCE_FAILED';
  if (stage === 'TICKETIZER') return 'TICKETIZER_REJECTED';

  // PLANNER stage mapping (best-effort)
  if (!raw) return 'OTHER';

  if (u.includes('NO_SESSION_METRICS') || u.includes('MISSING_SESSION_METRICS')) return 'MISSING_SESSION_METRICS';
  if (u.includes('NEWS_SESSION')) return 'NEWS_SESSION_BLOCKED';
  if (u.includes('OR_ATR_OUT_OF_RANGE') || u.includes('OR:ATR') || u.includes('OR_ATR')) return 'OR_ATR_OUT_OF_RANGE';
  if (u.includes('OR_NARROW') || u.includes('OR-TOO-NARROW') || u.includes('OR_TOO_NARROW')) return 'OR_TOO_NARROW';
  if (u.includes('VWAP_SLOPE')) return 'VWAP_SLOPE_BLOCKED';
  if (u.includes('NO_CLEAR_EDGE') || u.includes('NO_SETUP') || u.includes('NO-SETUP')) return 'NO_SETUP';

  return 'OTHER';
}
