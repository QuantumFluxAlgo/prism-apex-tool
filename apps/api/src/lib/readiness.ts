import type { FastifyInstance } from 'fastify';
import { getConfig } from '../config/env.js';
import { jobManager } from './jobManager.js';

export const DEFAULT_JOBS = ['marketFeed', 'strategies', 'ticketizer', 'telemetry', 'eodFlat'] as const;
export type JobKey = (typeof DEFAULT_JOBS)[number];
export type JobStatus = {
  registered: boolean;
  running: boolean;
  lastBeatTs: string | null;
  beatCount: number;
};
const defaultStatus: JobStatus = { registered: false, running: false, lastBeatTs: null, beatCount: 0 };

const JOB_NAME_MAP: Record<JobKey, string> = {
  marketFeed: 'FEED',
  strategies: 'STRATEGIES',
  ticketizer: 'TICKETIZER',
  telemetry: 'TELEMETRY',
  eodFlat: 'EOD_FLAT',
};

export function getReadySnapshot(_app: FastifyInstance, opts?: { includeDefaults?: boolean }) {
  const cfg = getConfig();
  const phase = process.env.ACCOUNT_PHASE === 'funded' ? 'funded' : 'eval';
  const consistencyMode = process.env.CONSISTENCY_ENFORCE === 'true' ? 'preblock' : 'metrics-only';

  const snap = jobManager.snapshot();
  const jobs: Record<JobKey, JobStatus> = {} as any;
  for (const key of DEFAULT_JOBS) {
    const internal = JOB_NAME_MAP[key];
    const js = snap[internal];
    if (js) {
      jobs[key] = js;
    } else if (opts?.includeDefaults) {
      jobs[key] = { ...defaultStatus };
    }
  }

  return {
    ok: true,
    env: {
      phase,
      flatByUtc: cfg.time.flatByUtc,
      minRR: cfg.guardrails.minRR,
      maxRR: cfg.guardrails.maxRR,
    },
    consistency: { mode: consistencyMode },
    jobs,
  };
}
