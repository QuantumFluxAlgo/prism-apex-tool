const rawEnvBase = import.meta.env?.VITE_API_BASE;
const hasEnvBase = typeof rawEnvBase === 'string';
const normalizedEnvBase = hasEnvBase
  ? rawEnvBase.trim() === '/'
    ? ''
    : rawEnvBase.trim().replace(/\/+$/, '')
  : undefined;

const windowOrigin =
  typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : undefined;

export const API_BASE =
  (hasEnvBase ? normalizedEnvBase : undefined) || windowOrigin || 'http://localhost:3000';

type FetchJsonOpts = RequestInit & { expected?: number[] };

export async function fetchJson(path: string, opts: FetchJsonOpts = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const expected = opts.expected ?? [200];
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow',
    ...opts,
    headers: {
      Accept: 'application/json',
      ...(opts.headers ?? {}),
    },
  });

  if (!expected.includes(res.status)) {
    const text = await res.text().catch(() => '');
    const hint = res.headers.get('content-type') || '(no content-type)';
    throw new Error(
      `[API] ${res.status} ${res.statusText} for ${url} — content-type: ${hint} — body: ${text.slice(0, 300)}`,
    );
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `[API] Expected JSON from ${url} but got ${ct || 'unknown'} — body starts: ${text.slice(0, 120)}`,
    );
  }

  return res.json();
}
