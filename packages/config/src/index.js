import { z } from 'zod';
const accountSchema = z.object({
  id: z.string(),
  phase: z.enum(['eval', 'funded']),
  maxContracts: z.number().int().min(1),
  bufferCleared: z.boolean(),
});
export function loadRegistry() {
  const phase = process.env.ACCOUNT_PHASE === 'funded' ? 'funded' : 'eval';
  const max = Number(process.env.APEX_MAX_CONTRACTS ?? 5);
  const id = process.env.ACCOUNT_ID ?? 'A1';
  return {
    accounts: [
      accountSchema.parse({
        id,
        phase,
        maxContracts: max,
        bufferCleared: false,
      }),
    ],
  };
}
