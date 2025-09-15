import { describe, it, expect } from 'vitest';
import { trackEvent, trackError, meter, createAnalyticsScope } from '../src/index.js';

describe('@prism-apex/analytics stub', () => {
  it('exports no-op functions without throwing', () => {
    expect(() => trackEvent('foo', { a: 1 })).not.toThrow();
    expect(() => trackError(new Error('x'), { where: 'test' })).not.toThrow();
    expect(() => meter('latency_ms', 12.3, { route: '/tickets' })).not.toThrow();
    const scoped = createAnalyticsScope('api');
    expect(scoped).toHaveProperty('trackEvent');
    expect(scoped).toHaveProperty('trackError');
    expect(scoped).toHaveProperty('meter');
  });
});
