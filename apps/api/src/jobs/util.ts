import { store } from '../store';
import { dispatch, type NotifyConfig, type NotifyMessage } from '../../../../packages/notify/src';

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

export async function notify(key: string, level: 'INFO'|'WARN'|'CRITICAL', subject: string, text: string, tags: string[] = []) {
  const cfg = loadNotifyConfig();
  const msg: NotifyMessage = { subject, text, level, tags };
  return dispatch(cfg, key, msg);
}
