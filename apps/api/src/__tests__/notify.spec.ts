import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;

beforeEach(async () => {
  // Isolate store data per test
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));

  // Force dry-run by clearing env
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  process.env.SMTP_FROM = 'test@example.com';

  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.TWILIO_SID;
  delete process.env.TWILIO_TOKEN;
  delete process.env.TWILIO_FROM;

  // Satisfy Tradovate client env requirements
  process.env.TRADOVATE_BASE_URL = 'http://localhost';
  process.env.TRADOVATE_USERNAME = 'u';
  process.env.TRADOVATE_PASSWORD = 'p';
  process.env.TRADOVATE_CLIENT_ID = 'cid';
  process.env.TRADOVATE_CLIENT_SECRET = 'csec';

  vi.useRealTimers();
  // Seed recipients (including Slack)
  store.addRecipients({
    email: ['ops@example.com'],
    telegram: ['123456789'],
    slack: ['C0123456'],
    sms: ['+15555550100'],
  });

  // Mock fetch for Telegram/Slack/Twilio if env were present
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }), text: async () => 'ok' }));
});

describe.skip('Notification API', () => {
  it('registers recipients (incl. Slack) and sends a dry-run test', async () => {
    const app = buildServer();

    const reg = await app.inject({
      method: 'POST',
      url: '/notify/register',
      payload: { email: ['team@example.com'], telegramChatId: '555', slackChannelId: 'C999', smsNumber: '+15555550123' },
    });
    expect(reg.statusCode).toBe(200);
    const rj = reg.json();
    expect(rj.recipients.email).toContain('team@example.com');
    expect(rj.recipients.telegram).toContain('555');
    expect(rj.recipients.slack).toContain('C999');
    expect(rj.recipients.sms).toContain('+15555550123');

    const testn = await app.inject({
      method: 'POST',
      url: '/notify/test',
      payload: { message: 'Hello', level: 'INFO', tags: ['UNIT'] },
    });
    expect(testn.statusCode).toBe(200);
    const transports = (testn.json().results as any[]).map(x => x.transport).join(',');
    expect(transports).toMatch(/email-dry-run/);
    expect(transports).toMatch(/telegram-dry-run/);
    expect(transports).toMatch(/slack-dry-run/);
  });

  it('rate-limits repeated keys', async () => {
    const app = buildServer();
    const first = await app.inject({ method: 'POST', url: '/notify/test', payload: { message: 'Once', level: 'WARN' } });
    const second = await app.inject({ method: 'POST', url: '/notify/test', payload: { message: 'Twice', level: 'WARN' } });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const transports2 = (second.json().results as any[]).map(x => x.transport).join(',');
    expect(transports2).toContain('suppressed');
  });
});
