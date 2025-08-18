import type { SmsConfig, NotifyMessage, ChannelResult } from './types';

export async function sendSms(cfg: SmsConfig | undefined, msg: NotifyMessage): Promise<ChannelResult> {
  if (!cfg?.twilioSid || !cfg.twilioToken || !cfg.from || !cfg.to?.length) {
    const preview = `[DRY-RUN:SMS] ${msg.subject}\n${msg.text}`;
    return { ok: true, transport: 'sms-dry-run', details: preview };
  }
  const auth = Buffer.from(`${cfg.twilioSid}:${cfg.twilioToken}`).toString('base64');
  for (const to of cfg.to) {
    const body = new URLSearchParams({ To: to, From: cfg.from, Body: `[${msg.level}] ${msg.subject}\n${msg.text}` });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return { ok: false, error: `Twilio HTTP ${res.status}` };
  }
  return { ok: true, transport: 'sms' };
}
