import type { JobFn } from './scheduler';
import { store } from '../store';
// TODO(Unquarantine Phase X): re-enable real implementation
export const jobMissingBrackets: JobFn = async () => {
  store.setOcoMissing(true);
};
