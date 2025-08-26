import type { JobFn } from './scheduler';
import { jobManager } from '../lib/jobManager.js';

let lastRun: number | undefined;

let timer: NodeJS.Timeout | null = null;

export const jobEodFlat: JobFn = () => {
  lastRun = Date.now();
  jobManager.beat('EOD_FLAT');
};

export function getLastEodFlat(): number | undefined {
  return lastRun;
}

export function registerEodFlatJob(): void {
  jobManager.register(
    'EOD_FLAT',
    () => {
      timer = setInterval(jobEodFlat, 60_000);
    },
    () => {
      if (timer) clearInterval(timer);
      timer = null;
    },
  );
}
