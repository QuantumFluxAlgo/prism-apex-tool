import type { ORRConfig } from '../../../dto/strategy-config/orr.js';
import { createValidationResult, finalizeValidation, type ValidationResult } from './types.js';

export function validateOrrConfig(config: ORRConfig): ValidationResult {
  const result = createValidationResult();

  if (config.maxRange <= 0) result.errors.push('maxRange must be greater than 0');
  if (config.minRR < 1) result.errors.push('minRR must be at least 1');
  if (config.stopSize <= 0) result.errors.push('stopSize must be greater than 0');
  if (config.retestDistance < 0) result.errors.push('retestDistance must be non-negative');

  if (config.enableRetestFilter && config.retestDistance <= 0) {
    result.errors.push('enableRetestFilter requires retestDistance to be greater than 0');
  }

  return finalizeValidation(result);
}
