export async function fetchPositions(accountId: string) {
  const res = await fetch(`/telemetry/positions?accountId=${accountId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAccount(accountId: string) {
  const res = await fetch(`/telemetry/account?accountId=${accountId}`);
  if (!res.ok) return null;
  return res.json();
}
