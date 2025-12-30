import type { OSBConfig } from '../../../dto/strategy-config/osb.js';
import { createValidationResult, finalizeValidation, type ValidationResult } from './types.js';

export function validateOsbConfig(config: OSBConfig): ValidationResult {
  const result = createValidationResult();

  if (config.openingRangeMinutes < 1 || config.openingRangeMinutes > 60) {
    result.errors.push('openingRangeMinutes must be between 1 and 60');
  }
  if (config.breakoutDistance <= 0) {
    result.errors.push('breakoutDistance must be greater than 0');
  }
  if (config.volatilityFilter < 0) {
    result.errors.push('volatilityFilter must be non-negative');
  }
  if (config.rrMultiple < 1) {
    result.errors.push('rrMultiple must be at least 1');
  }

  return finalizeValidation(result);
}
