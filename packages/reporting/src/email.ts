import type { DailyJson } from './types.js';

export type EmailResult = { ok: true; transport: 'noop'; preview?: string };

// TODO(Phase 2): re-enable real email sending with SMTP/nodemailer
export async function sendDailyEmail(
  _date: string,
  _to: string,
  _report: DailyJson,
  _csvAttachment?: string
): Promise<EmailResult> {
  return { ok: true, transport: 'noop' };
}
