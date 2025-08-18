import type { NotifyConfig, NotifyMessage, ChannelResult } from './types';
import { sendEmail } from './email';
import { sendTelegram } from './telegram';
import { sendSlack } from './slack';
import { sendSms } from './sms';

const lastSent: Record<string, number> = {};

function withinWindow(key: string, seconds: number): boolean {
  const now = Date.now();
  const last = lastSent[key] || 0;
  return now - last < seconds * 1000;
}
function markSent(key: string) { lastSent[key] = Date.now(); }

/**
 * Dispatch to all configured channels with a per-key rate limit.
 * SMS is CRITICAL-only to control cost.
 */
export async function dispatch(cfg: NotifyConfig, key: string, msg: NotifyMessage): Promise<ChannelResult[]> {
  const windowSec = cfg.rateLimit?.keySeconds ?? 60;
  if (withinWindow(key, windowSec)) {
    return [{ ok: true, transport: 'suppressed', details: `suppressed within ${windowSec}s window for ${key}` }];
  }

  const results: ChannelResult[] = [];
  results.push(await sendEmail(cfg.email, msg));
  results.push(await sendTelegram(cfg.telegram, msg));
  results.push(await sendSlack(cfg.slack, msg));
  if (msg.level === 'CRITICAL') results.push(await sendSms(cfg.sms, msg));

  markSent(key);
  return results;
}
