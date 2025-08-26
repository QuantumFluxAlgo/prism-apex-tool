import type { JobFn } from './scheduler';

let lastRun: number | undefined;

export const jobEodFlat: JobFn = () => {
  lastRun = Date.now();
};

export function getLastEodFlat(): number | undefined {
  return lastRun;
}
