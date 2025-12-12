import { fetchJson } from './apiBase';

export async function fetchPositions(accountId: string) {
  const params = new URLSearchParams({ accountId });
  try {
    return await fetchJson(`/api/telemetry/positions?${params.toString()}`);
  } catch {
    return [];
  }
}

export async function fetchAccount(accountId: string) {
  const params = new URLSearchParams({ accountId });
  try {
    return await fetchJson(`/api/telemetry/account?${params.toString()}`);
  } catch (err: any) {
    // treat 404/malformed responses as "not found" without bubbling to UI
    if (err instanceof Error && /404/.test(err.message)) {
      return null;
    }
    throw err;
  }
}
