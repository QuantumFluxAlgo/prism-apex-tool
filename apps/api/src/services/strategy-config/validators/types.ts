export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function createValidationResult(): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

export function finalizeValidation(result: ValidationResult): ValidationResult {
  result.ok = result.errors.length === 0;
  return result;
}
