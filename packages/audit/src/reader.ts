export interface AuditEvent {
  type?: string;
  [key: string]: unknown;
}

export function readEventsFromLines(lines: string[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const event: AuditEvent = { type: entry.event_type };
      const details = entry.details;
      if (details && typeof details === 'object') {
        Object.assign(event, details);
      }
      events.push(event);
    } catch {
      // ignore malformed lines
    }
  }
  // TODO(Phase 3): read from persistent audit log
  return events;
}
