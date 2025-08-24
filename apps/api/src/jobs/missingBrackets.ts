import type { JobFn } from './scheduler';
import { store } from '../store';

let missing = false;

export const jobMissingBrackets: JobFn = () => {
  missing = !missing;
  store.setOcoMissing(missing);
};
