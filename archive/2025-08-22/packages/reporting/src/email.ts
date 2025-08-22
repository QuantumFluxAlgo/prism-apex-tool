import nodemailer from 'nodemailer';
import type { DailyJson } from './types';

export type EmailResult = { ok: true; transport: 'smtp' | 'dry-run'; preview?: string };

export async function sendDailyEmail(date: string, to: string, report: DailyJson, csvAttachment?: string): Promise<EmailResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'prism-apex@localhost';

  const subject = `Prism Apex — Daily Report ${date}`;
  const text = [
    `Date: ${report.summary.date}`,
    `Tickets: ${report.summary.ticketsCount} (blocked ${report.summary.blockedCount})`,
    `Alerts: acked ${report.summary.alertsAcked}, queued ${report.summary.alertsQueued}`,
    `PnL: realized ${report.summary.pnl.realized.toFixed(2)}, unrealized ${report.summary.pnl.unrealized.toFixed(2)}, netLiq ${report.summary.pnl.netLiq.toFixed(2)}`,
  ].join('\n');

  // Dry-run when SMTP not configured
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const preview = [
      `TO: ${to}`,
      `SUBJECT: ${subject}`,
      `BODY:\n${text}`,
      csvAttachment ? `\nATTACHMENT:\n${csvAttachment.slice(0, 500)}\n...` : ''
    ].join('\n');
    return { ok: true, transport: 'dry-run', preview };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const attachments = csvAttachment ? [{ filename: `daily-${date}.csv`, content: csvAttachment }] : [];

  await transporter.sendMail({ from, to, subject, text, attachments });
  return { ok: true, transport: 'smtp' };
}
