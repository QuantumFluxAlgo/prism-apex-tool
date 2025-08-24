import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-'));
  ({ buildServer } = await import('../server.js'));
});

describe('Notify API', () => {
  it('merges recipients with de-duplication', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/notify/recipients',
      payload: { email: ['a@example.com', 'a@example.com'], telegram: ['1', '1'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toEqual(['a@example.com']);
    expect(body.telegram).toEqual(['1']);
  });
});
