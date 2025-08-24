import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { OSBInput, VWAPInput, SuggestionResultSchema } from '../schemas/signals.js';
import { PromoteInput } from '../schemas/ticketsPromote.js';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'token',
  description:
    'Send `Authorization: Bearer <token>`. Public endpoints (no auth): /health, /ready, /openapi.json, /version.',
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  // Empty security array here marks this endpoint as public,
  // even though global security is Bearer by default.
  security: [],
  responses: {
    200: {
      description: 'Readiness',
      content: {
        'application/json': { schema: z.object({ ok: z.boolean(), ready: z.boolean() }) },
      },
    },
  },
});

// ---- Shared schemas for simple endpoints ----
const SymbolsResponse = z.object({ symbols: z.array(z.string()) });
const SessionsResponse = z.object({
  RTH: z.object({ start: z.string(), end: z.string(), tz: z.string() }),
  ETH: z.object({ start: z.string(), end: z.string(), tz: z.string() }),
});
const ReportDailyQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// ---- Market ----
registry.registerPath({
  method: 'get',
  path: '/market/symbols',
  responses: {
    200: { description: 'Symbols', content: { 'application/json': { schema: SymbolsResponse } } },
  },
});
registry.registerPath({
  method: 'get',
  path: '/market/sessions',
  responses: {
    200: { description: 'Sessions', content: { 'application/json': { schema: SessionsResponse } } },
  },
});

// ---- Signals ----
registry.registerPath({
  method: 'post',
  path: '/signals/osb',
  request: { body: { content: { 'application/json': { schema: OSBInput } } } },
  responses: {
    200: {
      description: 'OSB suggestion',
      content: { 'application/json': { schema: SuggestionResultSchema } },
    },
  },
});
registry.registerPath({
  method: 'post',
  path: '/signals/vwap-first-touch',
  request: { body: { content: { 'application/json': { schema: VWAPInput } } } },
  responses: {
    200: {
      description: 'VWAP FT suggestion',
      content: { 'application/json': { schema: SuggestionResultSchema } },
    },
  },
});

// ---- Report ----
registry.registerPath({
  method: 'get',
  path: '/report/daily',
  request: { query: ReportDailyQuery },
  responses: {
    200: {
      description: 'Daily report summary',
      content: { 'application/json': { schema: z.any() } },
    },
  },
});

// ---- Tickets ----
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

// ---- Builder (includes security scheme) ----
export function buildOpenApi(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Prism Apex Tool API',
      version: '0.1.0',
      description: 'Public endpoints: /health, /ready, /openapi.json, /version.',
    },
    servers: [{ url: '/' }],
    security: [{ BearerAuth: [] }],
  }) as unknown as Record<string, unknown>;
}
export default registry;
