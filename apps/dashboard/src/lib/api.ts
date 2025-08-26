export type ComplianceSnapshot = {
  eodState: string;
  stopRequired: boolean;
  rrLeq5: boolean;
  ddHeadroom: boolean;
  halfSize: string | boolean;
  consistencyPolicy: { warnAt: number; failAt: number };
};

// TODO: replace with real API shapes when schema is finalized
export type Ticket = unknown;
export type Market = unknown;
export type Position = unknown;
export type Order = unknown;

const COMPAT_BASE =
  typeof window === 'undefined' ? 'http://localhost:3000/api/compat' : '/api/compat';

const DIRECT_BASE =
  typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;

async function request(base: string, path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(COMPAT_BASE, path),
  tickets: (date: string, cursor?: string) =>
    request(DIRECT_BASE, `/tickets?date=${date}${cursor ? `&cursor=${cursor}` : ''}`),
  ready: () => request(DIRECT_BASE, '/ready'),
};
