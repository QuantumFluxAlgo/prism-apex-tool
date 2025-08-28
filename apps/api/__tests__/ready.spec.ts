import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import readyRoute from '../src/routes/ready';
import { setJobBeat } from '@prism-apex-tool/runtime/health';

describe('GET /ready', () => {
  it('reports healthy when recent beats exist, otherwise degraded', async () => {
    const app = Fastify();
    app.register(readyRoute);

    // No beats yet → degraded
    let res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json().overall).toBe('degraded');

    // Set a beat → healthy
    setJobBeat('worker-1', Date.now());
    res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.overall === 'healthy' || body.overall === 'degraded').toBeTruthy();
    // With a fresh beat, we expect healthy:
    expect(body.overall).toBe('healthy');
    expect(body.jobs['worker-1'].healthy).toBe(true);
  });
});
