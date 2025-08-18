import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dispatch, type NotifyConfig, type NotifyMessage } from '../../../../packages/notify/src';
import { store } from '../store';

export function loadNotifyConfig(): NotifyConfig {
  return {
    email: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || 'prism-apex@localhost',
      to: store.getRecipients().email,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatIds: store.getRecipients().telegram,
    },
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN,
      channelIds: store.getRecipients().slack,
    },
    sms: {
      twilioSid: process.env.TWILIO_SID,
      twilioToken: process.env.TWILIO_TOKEN,
      from: process.env.TWILIO_FROM,
      to: store.getRecipients().sms,
    },
    rateLimit: { keySeconds: 60 },
  };
}

export async function notifyRoutes(app: FastifyInstance) {
  app.post('/notify/register', async (req, reply) => {
    const p = z.object({
      email: z.array(z.string().email()).optional(),
      telegramChatId: z.string().optional(),
      slackChannelId: z.string().optional(),
      smsNumber: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const updated = store.addRecipients({
      email: p.data.email,
      telegram: p.data.telegramChatId ? [p.data.telegramChatId] : undefined,
      slack: p.data.slackChannelId ? [p.data.slackChannelId] : undefined,
      sms: p.data.smsNumber ? [p.data.smsNumber] : undefined,
      tags: p.data.tags,
    });
    return { ok: true, recipients: updated };
  });

  app.post('/notify/test', async (req, reply) => {
    const p = z.object({
      message: z.string().min(1),
      level: z.enum(['INFO','WARN','CRITICAL']).default('INFO'),
      tags: z.array(z.string()).default([]),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const cfg = loadNotifyConfig();
    const msg: NotifyMessage = {
      subject: 'Manual Test',
      text: p.data.message,
      level: p.data.level,
      tags: p.data.tags,
    };
    const res = await dispatch(cfg, 'MANUAL_TEST', msg);
    return { ok: true, results: res };
  });
}
