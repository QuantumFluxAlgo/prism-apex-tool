export function loadNotifyConfig() {
  return {};
}

export async function notify(
  _key: string,
  _level: 'INFO' | 'WARN' | 'CRITICAL',
  _subject: string,
  _text: string,
  _tags: string[] = []
) {
  return { ok: false, reason: 'notify-disabled' };
}
