export function expBackoff(
  attempt: number,
  { baseMs = 250, maxMs = 30_000 }: { baseMs?: number; maxMs?: number } = {},
) {
  const cap = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * 0.2 + 0.9; // 0.9–1.1
  return Math.floor(cap * jitter);
}
