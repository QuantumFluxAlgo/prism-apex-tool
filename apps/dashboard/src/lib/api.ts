const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
};
