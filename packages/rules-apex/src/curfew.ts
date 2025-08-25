function parseUtcTime(flatByUtcHHmm: string, base: Date): Date {
  const [hh, mm] = flatByUtcHHmm.split(':').map((s) => parseInt(s, 10));
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh, mm, 0, 0),
  );
  return d;
}

export function isAfterFlat(nowUtc: Date, flatByUtcHHmm: string): boolean {
  const flatTime = parseUtcTime(flatByUtcHHmm, nowUtc);
  return nowUtc.getTime() >= flatTime.getTime();
}

export function withinSuppressionWindow(
  nowUtc: Date,
  flatByUtcHHmm: string,
  minutesBefore: number,
): boolean {
  const flatTime = parseUtcTime(flatByUtcHHmm, nowUtc);
  const diffMs = flatTime.getTime() - nowUtc.getTime();
  const diffMinutes = diffMs / 60000;
  return diffMinutes >= 0 && diffMinutes <= minutesBefore;
}
