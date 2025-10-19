const DIRECT_BASE =
  typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;

export function getApiBase(): string {
  return DIRECT_BASE;
}

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${url} -> ${res.status}${text ? ` ${text}` : ''}`);
  }
  return (await res.json()) as T;
}
