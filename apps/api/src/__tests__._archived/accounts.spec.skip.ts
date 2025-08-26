import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-'));
  process.env.BEARER_TOKEN = 't';
  ({ buildServer } = await import('../server.js'));
});

describe('Accounts API', () => {
  it('GET /accounts when empty -> []', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/accounts',
      headers: { authorization: 'Bearer t' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('PUT persists and GET retrieves account', async () => {
    const app = buildServer();
    const id = 'PA-150K-123456';
    const payload = { maxContracts: 17, bufferCleared: false, notes: 'plan:150k' };
    const putRes = await app.inject({
      method: 'PUT',
      url: `/accounts/${id}`,
      headers: { authorization: 'Bearer t' },
      payload,
    });
    expect(putRes.statusCode).toBe(200);
    const file = path.join(process.env.DATA_DIR!, 'accounts', `${id}.json`);
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(stored).toMatchObject({ id, ...payload });

    const getRes = await app.inject({
      method: 'GET',
      url: `/accounts/${id}`,
      headers: { authorization: 'Bearer t' },
    });
    expect(getRes.statusCode).toBe(200);
    const body = getRes.json();
    expect(body).toMatchObject({ id, ...payload });
    expect(typeof body.updatedAt).toBe('string');
  });

  it('PUT partial update keeps other fields', async () => {
    const app = buildServer();
    const id = 'PA-150K-123456';
    await app.inject({
      method: 'PUT',
      url: `/accounts/${id}`,
      headers: { authorization: 'Bearer t' },
      payload: { maxContracts: 17, bufferCleared: false, notes: 'plan:150k' },
    });
    const res = await app.inject({
      method: 'PUT',
      url: `/accounts/${id}`,
      headers: { authorization: 'Bearer t' },
      payload: { bufferCleared: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id,
      maxContracts: 17,
      bufferCleared: true,
      notes: 'plan:150k',
    });
  });

  it('requires auth', async () => {
    const app = buildServer();
    const resList = await app.inject({ method: 'GET', url: '/accounts' });
    expect(resList.statusCode).toBe(401);
    const resPut = await app.inject({
      method: 'PUT',
      url: '/accounts/PA-1',
      payload: { maxContracts: 1 },
    });
    expect(resPut.statusCode).toBe(401);
  });

  it('rejects bad payload', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'PUT',
      url: '/accounts/PA-1',
      headers: { authorization: 'Bearer t' },
      payload: { maxContracts: -1 },
    });
    expect(res.statusCode).toBe(400);
  });
});
