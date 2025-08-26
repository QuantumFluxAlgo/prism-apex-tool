export type AnalyticsProps = Record<string, unknown>;
export type AnalyticsTags = Record<string, string | number | boolean>;

/** No-op event tracker (placeholder) */
export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  // intentionally empty (stub)
}

/** No-op error tracker (placeholder) */
export function trackError(error: unknown, context: AnalyticsProps = {}): void {
  // intentionally empty (stub)
}

/** No-op metric emitter (placeholder) */
export function meter(name: string, value: number, tags: AnalyticsTags = {}): void {
  // intentionally empty (stub)
}

/** Simple scoped helper that returns same fns for consistency */
export function createAnalyticsScope(_scope: string) {
  return { trackEvent, trackError, meter };
}
