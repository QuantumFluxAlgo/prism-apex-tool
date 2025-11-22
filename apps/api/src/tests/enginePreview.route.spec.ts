import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import enginePreviewRoutes from '../routes/enginePreview.js';
import { runEnginePreview } from '../services/strategy-engine/index.js';

vi.mock('../services/strategy-engine/index.js', () => ({
  runEnginePreview: vi.fn(),
}));

const mockedRunEnginePreview = runEnginePreview as unknown as vi.Mock;

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(enginePreviewRoutes, { prefix: '/api/engine' });
  return app;
}

function makePreviewResponse() {
  return {
    strategy: 'orr',
    symbol: 'ES',
    sessionDate: '2025-01-15',
    configVersion: 42,
    signals: [],
    meta: {
      engineVersion: '0.5.0-orr-osb-vwapft',
      riskEngineVersion: '2.0.0-risk',
      strategyConfigVersion: 42,
      barCount: 100,
      sessionStart: '2025-01-15T14:30:00Z',
      sessionEnd: '2025-01-15T21:00:00Z',
      notes: 'test-notes',
      safetyEnvelope: 'strict-enforced',
      safetyEnvelopeDropped: 0,
    },
  };
}

describe('POST /api/engine/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns preview payload when request is valid', async () => {
    mockedRunEnginePreview.mockResolvedValueOnce(makePreviewResponse());
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/engine/preview',
      payload: {
        strategy: 'orr',
        symbol: 'ES',
        sessionDate: '2025-01-15',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      strategy: 'orr',
      symbol: 'ES',
      sessionDate: '2025-01-15',
      meta: expect.objectContaining({
        engineVersion: '0.5.0-orr-osb-vwapft',
      }),
    });
  });

  it('returns 400 when payload validation fails', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/engine/preview',
      payload: {
        strategy: 'orr',
        symbol: '',
        sessionDate: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('Invalid engine preview request');
    expect(mockedRunEnginePreview).not.toHaveBeenCalled();
  });

  it('returns 500 when runEnginePreview throws', async () => {
    mockedRunEnginePreview.mockRejectedValueOnce(new Error('engine boom'));
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/engine/preview',
      payload: {
        strategy: 'orr',
        symbol: 'ES',
        sessionDate: '2025-01-15',
      },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error).toBe('Engine preview failed');
  });
});
