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

const API_BASE =
  typeof window === "undefined"
    ? "http://localhost:3000/api/compat"
    : "/api/compat";

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${text ? `: ${text}` : ""}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
};

