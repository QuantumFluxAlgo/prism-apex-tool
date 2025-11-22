/* eslint-disable no-console */

export interface StructuredLogger {
  warn(entry: Record<string, unknown>): void;
}

function serialize(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(entry);
  } catch {
    return JSON.stringify({ type: 'governance_alert', error: 'serialization_failed' });
  }
}

export const logger: StructuredLogger = {
  warn(entry: Record<string, unknown>): void {
    console.warn(serialize(entry));
  },
};
