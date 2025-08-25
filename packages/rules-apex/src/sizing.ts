export function suggestPercent(
  maxContracts: number,
  bufferCleared: boolean,
  pctWhenNoBuffer: number,
  pctWithBuffer: number,
): { contracts: number; halfSizeSuggested: boolean } {
  const pct = bufferCleared ? pctWithBuffer : pctWhenNoBuffer;
  const contracts = Math.max(1, Math.floor(maxContracts * pct));
  const halfSizeSuggested = !bufferCleared && pctWhenNoBuffer < pctWithBuffer;
  return { contracts, halfSizeSuggested };
}
