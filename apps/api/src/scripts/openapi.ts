import { buildOpenApi } from '../openapi/spec.js';

process.stdout.write(JSON.stringify(buildOpenApi(), null, 2));

