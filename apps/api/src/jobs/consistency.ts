import type { JobFn } from './scheduler';
import { store } from '../store';

export const jobConsistency: JobFn = () => {
  const rc = store.getRiskContext();
  if (rc.maxContracts < 1) {
    store.setRiskContext({ maxContracts: 1 });
  }
};
