/** No-op event tracker (placeholder) */
export function trackEvent(name, props = {}) {
  // intentionally empty (stub)
}
/** No-op error tracker (placeholder) */
export function trackError(error, context = {}) {
  // intentionally empty (stub)
}
/** No-op metric emitter (placeholder) */
export function meter(name, value, tags = {}) {
  // intentionally empty (stub)
}
/** Simple scoped helper that returns same fns for consistency */
export function createAnalyticsScope(_scope) {
  return { trackEvent, trackError, meter };
}
