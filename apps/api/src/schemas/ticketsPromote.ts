import { z } from 'zod';
import { SuggestionSchema } from './signals.js';

export const PromoteInput = z.object({
  suggestion: SuggestionSchema,
  when: z.string().optional(), // ISO timestamp; defaults to now
  reasons: z.array(z.string()).optional(),
});

export type PromoteInputT = z.infer<typeof PromoteInput>;
