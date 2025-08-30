export function lastAudit() {
  return { ts: new Date().toISOString(), ok: true };
}
