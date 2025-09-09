/**
 * Test-only assertion utilities.
 * Keeps TS happy when values may be undefined/null in fixtures.
 */
export function ensureDefined<T>(value: T, msg = 'Expected value to be defined'): asserts value is NonNullable<T> {
   
  if (value === undefined || value === null) {
    throw new Error(msg);
  }
}
