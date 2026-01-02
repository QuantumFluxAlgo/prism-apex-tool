// EPIC 8 – Next-Trade Sizing (frontend helper)
//
// NOTE: The backend already exposes /api/operator-risk/sizing.
// This client is intentionally tolerant of shape differences: we surface
// a few commonly useful numeric fields when present, and keep the rest
// available on the raw payload.

export interface OperatorSizingPayload {
  // Commonly expected fields; all optional to avoid tight coupling.
  tradingDay?: string;
  suggestedContracts?: number;
  minContracts?: number;
  maxContracts?: number;
  perContractRisk?: number;
  projectedDailyRiskPct?: number;
  remainingDrawdownPct?: number;
  utilisationPct?: number;
  notes?: string;
  // Allow any other fields without compile-time failure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface OperatorSizingResponse {
  sizing: OperatorSizingPayload | null;
}

function parseJsonSafely<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return Promise.reject(
      new Error(`Failed to fetch operator sizing: ${res.status} ${res.statusText}`),
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch next-trade sizing recommendation based on current operator risk config.
 *
 * GET /api/operator-risk/sizing
 */
export async function fetchOperatorSizing(): Promise<OperatorSizingPayload | null> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/operator-risk/sizing', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = await parseJsonSafely<OperatorSizingResponse>(res);
  return body.sizing ?? null;
}
