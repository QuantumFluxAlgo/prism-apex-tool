import nodemailer from 'nodemailer';
import type { EmailConfig, NotifyMessage, ChannelResult } from './types';

export async function sendEmail(cfg: EmailConfig | undefined, msg: NotifyMessage): Promise<ChannelResult> {
  if (!cfg || !cfg.host || !cfg.port || !cfg.user || !cfg.pass || !cfg.from || !cfg.to?.length) {
    const preview = `[DRY-RUN:EMAIL]\nFROM:${cfg?.from || 'n/a'}\nTO:${(cfg?.to || []).join(',')}\nSUBJECT:${msg.subject}\n${msg.text}`;
    return { ok: true, transport: 'email-dry-run', details: preview };
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const info = await transporter.sendMail({
    from: cfg.from,
    to: cfg.to.join(','),
    subject: `[${msg.level}] ${msg.subject}`,
    text: `${msg.text}${msg.tags?.length ? `\n\n#${msg.tags.join(' #')}` : ''}`,
  });
  return { ok: true, transport: 'email', details: String((info as any).messageId || '') };
}
