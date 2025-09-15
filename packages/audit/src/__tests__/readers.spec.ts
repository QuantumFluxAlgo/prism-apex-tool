import { describe, expect, it } from 'vitest';
import { readEventsFromLines } from '../index.js';

describe('audit readers', () => {
  it('parses events from log lines', () => {
    const lines = [
      '{"event_type":"TICKET","details":{"id":1}}',
      '{"event_type":"PANIC","details":{"reason":"test"}}',
    ];
    const events = readEventsFromLines(lines);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'TICKET', id: 1 });
    expect(events[0].details).toEqual({ id: 1 });
    expect(events[1]).toMatchObject({ type: 'PANIC', reason: 'test' });
    expect(events[1].details).toEqual({ reason: 'test' });
  });

  it('ignores blank, malformed, and non-object lines', () => {
    const lines = [
      '   ',
      'not json',
      '{"event_type":"TRADE","details":{"pnl":250,"fees":5},"timestamp":"2025-02-01T00:00:00Z"}',
      '42',
      '{"event_type":"RULE_CHECK","details":null}',
    ];
    const events = readEventsFromLines(lines);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: 'TRADE',
      timestamp: '2025-02-01T00:00:00Z',
      pnl: 250,
      fees: 5,
    });
    expect(events[0].details).toEqual({ pnl: 250, fees: 5 });
    expect(events[1]).toMatchObject({ type: 'RULE_CHECK' });
    expect(events[1].details).toBeNull();
  });

  it('does not override top-level fields when merging details', () => {
    const lines = [
      JSON.stringify({
        event_type: 'PANIC',
        type: 'ORIGINAL',
        message: 'Operator panic button pressed',
        details: {
          type: 'DETAIL',
          reason: 'system',
          message: 'should not override',
        },
      }),
    ];
    const [event] = readEventsFromLines(lines);
    expect(event.type).toBe('PANIC');
    expect(event.message).toBe('Operator panic button pressed');
    expect(event.reason).toBe('system');
    expect(event.details).toEqual({
      type: 'DETAIL',
      reason: 'system',
      message: 'should not override',
    });
  });
});
