import type { VwapFTConfig } from '../../../dto/strategy-config/vwapft.js';
import { createValidationResult, finalizeValidation, type ValidationResult } from './types.js';

export function validateVwapftConfig(config: VwapFTConfig): ValidationResult {
  const result = createValidationResult();

  if (!config.deviationBands.length) {
    result.errors.push('At least one deviation band is required');
  }
  if (config.deviationBands.some((value: number) => value <= 0)) {
    result.errors.push('Deviation bands must be greater than 0');
  }
  if (config.minATR <= 0) {
    result.errors.push('minATR must be greater than 0');
  }
  if (config.lookbackPeriod <= 0) {
    result.errors.push('lookbackPeriod must be greater than 0');
  }
  if (!config.sessionWindow.trim()) {
    result.errors.push('sessionWindow must be a non-empty string');
  }

  return finalizeValidation(result);
}
