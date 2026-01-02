import { incrementPlannerRejectCount } from '../store/plannerRejectCounts.js';
import {
  canonicalizePlannerKey,
  mapRawReasonToPlannerRejectCode,
  type PlannerKey,
  type RejectStage,
} from './plannerRejectVocab.js';

export type RecordPlannerRejectInput = {
  sessionDate: string;
  symbol: string;
  requestedPlannerRaw: string;
  rejectingPlannerRaw: string;
  rejectStage: RejectStage;
  rawReason?: string | null;
  delta?: number;
};

const DEFAULT_PLANNER: PlannerKey = 'ddb';

function resolvePlanner(raw: string): PlannerKey {
  return canonicalizePlannerKey(raw) ?? DEFAULT_PLANNER;
}

export async function recordPlannerRejectCountBestEffort(input: RecordPlannerRejectInput): Promise<void> {
  try {
    const rejectingPlanner = resolvePlanner(input.rejectingPlannerRaw);
    const requestedPlanner = resolvePlanner(input.requestedPlannerRaw || rejectingPlanner);

    const reasonCode = mapRawReasonToPlannerRejectCode({
      rejectStage: input.rejectStage,
      rawReason: input.rawReason ?? '',
    });

    await incrementPlannerRejectCount({
      sessionDate: input.sessionDate,
      symbol: input.symbol,
      requestedPlanner,
      rejectingPlanner,
      rejectStage: input.rejectStage,
      reasonCode,
      delta: input.delta ?? 1,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[plannerRejectRecorder] best-effort drop', {
      stage: input.rejectStage,
      sessionDate: input.sessionDate,
      symbol: input.symbol,
      requestedPlannerRaw: input.requestedPlannerRaw,
      rejectingPlannerRaw: input.rejectingPlannerRaw,
    });
  }
}
