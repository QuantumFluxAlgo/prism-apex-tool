import { describe, expect, it } from 'vitest';
import { readEventsFromLines } from '../index.js';

describe('audit readers', () => {
  it('parses events from log lines', () => {
    const lines = [
      '{"event_type":"TICKET","details":{"id":1}}',
      '{"event_type":"PANIC","details":{"reason":"test"}}',
    ];
    const events = readEventsFromLines(lines);
    expect(events.length).toBe(2);
    expect(events[1]).toMatchObject({ type: 'PANIC', reason: 'test' });
  });
});
