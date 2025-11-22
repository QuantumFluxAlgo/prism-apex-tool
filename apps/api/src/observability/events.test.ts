import { describe, expect, it } from 'vitest';

import {
  __setObservabilityLoggerForTests,
  recordEvent,
  type ObservabilityEvent,
  type ObservabilityLogger,
} from './events.js';

describe('observability events helper', () => {
  it('fills timestamp when missing', () => {
    const events: ObservabilityEvent[] = [];
    const logger: ObservabilityLogger = {
      record(event: ObservabilityEvent): void {
        events.push(event);
      },
    };

    __setObservabilityLoggerForTests(logger);

    recordEvent({
      kind: 'TICKET_CREATED',
      source: 'test/spec',
      payload: { ticketId: 'T-1' },
    });

    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
    expect(events[0].payload.ticketId).toBe('T-1');

    __setObservabilityLoggerForTests(null);
  });

  it('swallows logger failures', () => {
    const badLogger: ObservabilityLogger = {
      record(): void {
        throw new Error('boom');
      },
    };

    __setObservabilityLoggerForTests(badLogger);

    expect(() =>
      recordEvent({
        kind: 'API_ERROR',
        source: 'test/spec',
        payload: { message: 'something failed' },
      }),
    ).not.toThrow();

    __setObservabilityLoggerForTests(null);
  });
});
