/** Assert an array is present and has at least one element. */
export function assertArrayNotEmpty<T>(arr: T[] | readonly T[] | null | undefined, msg = 'Expected non-empty array'): asserts arr is T[] {
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(msg);
}

/** Safe helper to pick first item after asserting non-empty. */
export function pickFirst<T>(arr: T[] | readonly T[], msg = 'Expected non-empty array'): T {
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(msg);
  return arr[0]!;
}
