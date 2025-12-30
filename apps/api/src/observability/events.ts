/* eslint-disable @typescript-eslint/no-explicit-any */

export type ObservabilityEventKind =
  | 'INGRESS_BAR_BATCH'
  | 'SESSION_METRICS_COMPUTED'
  | 'STRATEGY_SIGNAL'
  | 'TICKET_CREATED'
  | 'RISK_DECISION'
  | 'OPERATOR_ACTION'
  | 'API_ERROR';

export interface ObservabilityEventBase {
  kind: ObservabilityEventKind;
  timestamp: string;
  source: string;
  correlationId?: string;
}

export type ObservabilityEventPayload = Record<string, unknown>;

export interface ObservabilityEvent extends ObservabilityEventBase {
  payload: ObservabilityEventPayload;
}

export interface ObservabilityLogger {
  record(event: ObservabilityEvent): void;
}

export function createConsoleObservabilityLogger(): ObservabilityLogger {
  return {
    record(event: ObservabilityEvent): void {
      // eslint-disable-next-line no-console
      console.log('[obs]', JSON.stringify(event));
    },
  };
}

let currentLogger: ObservabilityLogger = createConsoleObservabilityLogger();

export function __setObservabilityLoggerForTests(logger: ObservabilityLogger | null) {
  currentLogger = logger ?? createConsoleObservabilityLogger();
}

export function recordEvent(
  partial: Omit<ObservabilityEvent, 'timestamp'> & { timestamp?: string },
): void {
  const event: ObservabilityEvent = {
    timestamp: partial.timestamp ?? new Date().toISOString(),
    kind: partial.kind,
    source: partial.source,
    correlationId: partial.correlationId,
    payload: partial.payload ?? {},
  };

  try {
    currentLogger.record(event);
  } catch {
    // Observability must never break business logic.
  }
}

export function recordTicketCreatedEvent(payload: ObservabilityEventPayload): void {
  recordEvent({
    kind: 'TICKET_CREATED',
    source: 'api/orchestrator',
    payload,
  });
}

export function recordRiskDecisionEvent(payload: ObservabilityEventPayload): void {
  recordEvent({
    kind: 'RISK_DECISION',
    source: 'api/risk-engine-v2',
    payload,
  });
}

export function recordOperatorActionEvent(payload: ObservabilityEventPayload): void {
  recordEvent({
    kind: 'OPERATOR_ACTION',
    source: 'api/operator',
    payload,
  });
}
