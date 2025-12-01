export type StrategyKind = 'VWAP_FIRST_TOUCH' | 'OPENING_RANGE_REVERSION' | 'OSB_BREAKOUT';

export interface StrategyParameter {
  key: string;
  label: string;
  description: string;
  group: string;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface StrategyConfigSet {
  id: string;
  kind: StrategyKind;
  label: string;
  description: string;
  enabledByDefault: boolean;
  parameters: StrategyParameter[];
}

export interface StrategyConfigResponse {
  sets: StrategyConfigSet[];
}

function parseJsonSafely<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return Promise.reject(new Error(`Failed to fetch strategy config: ${res.status} ${res.statusText}`));
  }
  return res.json() as Promise<T>;
}

export async function fetchStrategyConfig(): Promise<StrategyConfigSet[]> {
  const res = await fetch('/api/strategies/config', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = await parseJsonSafely<StrategyConfigResponse>(res);
  return body.sets ?? [];
}
