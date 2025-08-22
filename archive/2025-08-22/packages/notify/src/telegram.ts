import type { TelegramConfig, NotifyMessage, ChannelResult } from './types';

export async function sendTelegram(cfg: TelegramConfig | undefined, msg: NotifyMessage): Promise<ChannelResult> {
  if (!cfg?.botToken || !cfg.chatIds?.length) {
    const preview = `[DRY-RUN:TELEGRAM] ${msg.subject}\n${msg.text}`;
    return { ok: true, transport: 'telegram-dry-run', details: preview };
  }
  const base = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  let last = '';
  for (const chatId of cfg.chatIds) {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `[#${msg.level}] ${msg.subject}\n${msg.text}${msg.tags?.length ? `\n\n#${msg.tags.join(' #')}` : ''}`,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) return { ok: false, error: `Telegram HTTP ${res.status}` };
    last = await res.text();
  }
  return { ok: true, transport: 'telegram', details: last.slice(0, 120) };
}
