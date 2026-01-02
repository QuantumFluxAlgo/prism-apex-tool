const GLOBAL_KEY = '__PRISM_CONTRACT_TELEMETRY__';

type ContractTelemetryEvent =
  | {
      type: 'page-load';
      pageId: string;
      timestamp: string;
    }
  | {
      type: 'contract-error';
      pageId: string;
      endpoint: string;
      status?: number;
      message?: string;
      timestamp: string;
    };

function publish(event: ContractTelemetryEvent) {
  if (typeof window !== 'undefined') {
    const store = (window as any)[GLOBAL_KEY] ?? [];
    store.push(event);
    (window as any)[GLOBAL_KEY] = store;
  }

  if (typeof console !== 'undefined' && console.info) {
    const label =
      event.type === 'page-load'
        ? `[contract] page-load:${event.pageId}`
        : `[contract] contract-error:${event.pageId}`;
    console.info(label, event);
  }
}

export function logPageLoad(pageId: string) {
  publish({
    type: 'page-load',
    pageId,
    timestamp: new Date().toISOString(),
  });
}

export function logContractError(params: {
  pageId: string;
  endpoint: string;
  status?: number;
  error?: unknown;
}) {
  const message =
    params.error instanceof Error
      ? params.error.message
      : typeof params.error === 'string'
      ? params.error
      : undefined;

  publish({
    type: 'contract-error',
    pageId: params.pageId,
    endpoint: params.endpoint,
    status: params.status,
    message,
    timestamp: new Date().toISOString(),
  });
}
