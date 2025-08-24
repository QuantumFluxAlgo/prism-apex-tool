import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { PromoteInput } from '../schemas/ticketsPromote.js';

export const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/tickets/promote',
  request: { body: { content: { 'application/json': { schema: PromoteInput } } } },
  responses: {
    200: {
      description: 'Promoted suggestion to ticket',
      content: {
        'application/json': {
          schema: z.object({ ok: z.boolean(), when: z.string(), id: z.string() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/tickets',
  request: { query: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) },
  responses: {
    200: {
      description: 'Tickets for date',
      content: { 'application/json': { schema: z.array(z.any()) } },
    },
  },
});

export default registry;
