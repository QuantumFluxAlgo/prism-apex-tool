import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { OSBInput, VWAPInput, SuggestionResultSchema } from '../schemas/signals.js';
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const SymbolsResponse = z.object({ symbols: z.array(z.string()) });
const SessionsResponse = z.object({
  RTH: z.object({ start: z.string(), end: z.string(), tz: z.string() }),
  ETH: z.object({ start: z.string(), end: z.string(), tz: z.string() }),
});
const ReportDailyQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

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

export function buildOpenApi(): any {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'Prism Apex Tool API', version: '0.1.0' },
    servers: [{ url: '/' }],
  });
}
