import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Notify API', () => {
  it('registers recipients', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/notify/recipients',
      payload: { email: ['team@example.com'], sms: ['+15555550123'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recipients.email).toContain('team@example.com');
    expect(body.recipients.sms).toContain('+15555550123');
    // ensure store updated
    const recipients = store.getRecipients();
    expect(recipients.email).toContain('team@example.com');
  });
});
