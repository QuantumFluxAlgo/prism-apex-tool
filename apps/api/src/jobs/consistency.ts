import type { JobFn } from './scheduler.js';
import { store } from '../store.js';

export const jobConsistency: JobFn = () => {
  const rc = store.getRiskContext();
  if (rc.maxContracts < 1) {
    store.setRiskContext({ maxContracts: 1 });
  }
};
