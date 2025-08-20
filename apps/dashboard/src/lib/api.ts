const API_BASE =
  typeof window === 'undefined'
    ? 'http://localhost:3000/api/compat'
    : '/api/compat';

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
};

