export type AnalyticsProps = Record<string, unknown>;
export type AnalyticsTags = Record<string, string | number | boolean>;
/** No-op event tracker (placeholder) */
export declare function trackEvent(name: string, props?: AnalyticsProps): void;
/** No-op error tracker (placeholder) */
export declare function trackError(error: unknown, context?: AnalyticsProps): void;
/** No-op metric emitter (placeholder) */
export declare function meter(name: string, value: number, tags?: AnalyticsTags): void;
/** Simple scoped helper that returns same fns for consistency */
export declare function createAnalyticsScope(_scope: string): {
  trackEvent: typeof trackEvent;
  trackError: typeof trackError;
  meter: typeof meter;
};
//# sourceMappingURL=index.d.ts.map
