import { z } from 'zod';

export const recipientsSchema = z.object({
  email: z.array(z.string()).optional(),
  telegram: z.array(z.string()).optional(),
  slack: z.array(z.string()).optional(),
  sms: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const recipientsResultSchema = z.object({
  email: z.array(z.string()),
  telegram: z.array(z.string()),
  slack: z.array(z.string()),
  sms: z.array(z.string()),
  tags: z.array(z.string()).optional(),
});

export type RecipientsInput = z.infer<typeof recipientsSchema>;
export type Recipients = z.infer<typeof recipientsResultSchema>;
