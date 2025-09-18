import type { FastifyInstance } from 'fastify';

/**
 * Load the OpenAPI spec without requiring a specific export shape.
 * Uses dynamic import (ESM-friendly) and avoids 'require' so lint passes.
 */
async function loadSpec(): Promise<any> {
  try {
    const m = await import('../openapi/spec.js'); // tsup emits .js next to this file
    if (typeof (m as any)?.buildOpenApi === 'function') return (m as any).buildOpenApi();
    if (typeof (m as any)?.buildOpenApiSpec === 'function') return (m as any).buildOpenApiSpec();
    if (typeof (m as any)?.makeSpec === 'function') return (m as any).makeSpec();
    if ((m as any)?.spec) return (m as any).spec;
    if (typeof (m as any)?.default?.buildOpenApi === 'function') return (m as any).default.buildOpenApi();
    if ((m as any)?.default) return (m as any).default;
    return m;
  } catch {
    return { openapi: '3.0.0', info: { title: 'api', version: '0.0.0' }, paths: {} };
  }
}

export async function openapiRoutes(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    const spec = await loadSpec();
    return reply.type('application/json').send(spec);
  });
}
