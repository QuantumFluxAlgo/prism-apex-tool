export interface AuditEvent {
  type?: string;
  timestamp?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readEventsFromLines(lines: Iterable<string>): AuditEvent[] {
  const events: AuditEvent[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (!isPlainRecord(parsed)) {
      continue;
    }

    const { event_type, details, ...rest } = parsed;

    const event: AuditEvent = { ...rest };

    if (typeof event_type === 'string') {
      event.type = event_type;
    }

    if (details !== undefined) {
      if (isPlainRecord(details)) {
        const clonedDetails = { ...details };
        event.details = clonedDetails;

        for (const [key, value] of Object.entries(clonedDetails)) {
          if (!Object.prototype.hasOwnProperty.call(event, key)) {
            event[key] = value;
          }
        }
      } else {
        event.details = details;
      }
    }

    events.push(event);
  }

  return events;
}

export function lastAudit() {
  return { ts: new Date().toISOString(), ok: true };
}
