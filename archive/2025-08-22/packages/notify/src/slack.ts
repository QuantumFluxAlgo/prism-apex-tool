import type { SlackConfig, NotifyMessage, ChannelResult } from './types';

/**
 * Slack Web API: chat.postMessage
 * https://api.slack.com/methods/chat.postMessage
 */
export async function sendSlack(cfg: SlackConfig | undefined, msg: NotifyMessage): Promise<ChannelResult> {
  if (!cfg?.botToken || !cfg.channelIds?.length) {
    const preview = `[DRY-RUN:SLACK] ${msg.subject}\n${msg.text}`;
    return { ok: true, transport: 'slack-dry-run', details: preview };
  }
  const url = 'https://slack.com/api/chat.postMessage';
  for (const channel of cfg.channelIds) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${cfg.botToken}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel,
        text: `[#${msg.level}] ${msg.subject}\n${msg.text}${msg.tags?.length ? `\n\n#${msg.tags.join(' #')}` : ''}`,
        mrkdwn: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      return { ok: false, error: `Slack HTTP ${res.status} ${json.error || ''}` };
    }
  }
  return { ok: true, transport: 'slack' };
}
