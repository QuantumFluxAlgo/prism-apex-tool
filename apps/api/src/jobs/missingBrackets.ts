import type { JobFn } from './scheduler.js';
import { store } from '../store.js';

let missing = false;

export const jobMissingBrackets: JobFn = () => {
  missing = !missing;
  store.setOcoMissing(missing);
};
