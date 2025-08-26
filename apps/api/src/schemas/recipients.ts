import { z } from 'zod';

export const recipientsSchema = z.object({
  email: z.array(z.string().email()).optional(),
  telegram: z.array(z.string()).optional(),
  slack: z.array(z.string()).optional(),
  sms: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type RecipientsPayload = z.infer<typeof recipientsSchema>;
