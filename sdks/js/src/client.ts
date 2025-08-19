export type SDKOptions = {
  baseUrl?: string;         // default http://localhost:8080
  fetchImpl?: typeof fetch; // override for tests
  apiKey?: string;          // reserved, not used in MVP
};

export class PrismClient {
  private baseUrl: string;
  private f: typeof fetch;

  constructor(opts: SDKOptions = {}) {
    this.baseUrl = (opts.baseUrl || 'http://localhost:8080').replace(new RegExp('/+$'), '');
    this.f = opts.fetchImpl || fetch;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.f(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {}),
      }
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
    }
    if (res.headers.get('content-type')?.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    // @ts-expect-error allow non-json (openapi route MVP returns yaml container)
    return res.text();
  }

  getHealth() { return this.req<{ ok: boolean }>('/health'); }

  listTickets() { return this.req<Ticket[]>('/tickets'); }

  previewSignal(body: SignalPreviewRequest) {
    return this.req<SignalPreviewResponse>('/signals/preview', { method: 'POST', body: JSON.stringify(body) });
  }

  commitTicket(body: TicketCommitRequest) {
    return this.req<Ticket>('/tickets/commit', { method: 'POST', body: JSON.stringify(body) });
  }

  getAccount() { return this.req<AccountStatus>('/account'); }

  getRulesStatus() { return this.req<RulesStatus>('/rules/status'); }

  listAlerts() { return this.req<Alert[]>('/alerts'); }

  getReports() { return this.req<ReportSummary>('/reports'); }

  registerRecipients(body: NotifyRegisterRequest) {
    return this.req<NotifyRegisterResponse>('/notify/register', { method: 'POST', body: JSON.stringify(body) });
  }

  sendTestNotification(body: NotifyTestRequest) {
    return this.req<NotifyTestResponse>('/notify/test', { method: 'POST', body: JSON.stringify(body) });
  }

  getJobsStatus() { return this.req<JobsStatus>('/jobs/status'); }

  getOpenApi() { return this.req<any>('/openapi.json'); }
}

/** ---- Types (mirrored from OpenAPI; keep minimal & readable) ---- */
export type Ticket = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  size: number;
  time: string;
};

export type SignalPreviewRequest = {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  size: number;
  mode: 'evaluation' | 'funded';
};

export type SignalPreviewResponse = {
  block: boolean;
  reasons: string[];
  normalized?: { entry?: number; stop?: number; target?: number; size?: number };
};

export type TicketCommitRequest = SignalPreviewRequest;

export type AccountStatus = { balance: number; drawdown: number; openPositions: number; netLiqHigh?: number | null };

export type RulesStatus = {
  stopRequired: boolean;
  rrLeq5: boolean;
  ddHeadroom: boolean;
  halfSize: string;
  consistencyPolicy: { warnAt: number; failAt: number };
  eodState: 'OK' | 'BLOCK_NEW' | 'EOD';
};

export type Alert = { level: 'INFO' | 'WARN' | 'CRITICAL'; message: string; ts: string; tags?: string[] };

export type ReportSummary = { win_rate: number; avg_r: number; max_dd: number; rule_breaches: number };

export type NotifyRegisterRequest = {
  email?: string[];
  telegramChatId?: string;
  slackChannelId?: string;
  smsNumber?: string;
};

export type NotifyRegisterResponse = {
  ok: boolean;
  recipients: { email?: string[]; telegram?: string[]; slack?: string[]; sms?: string[] };
};

export type NotifyTestRequest = { message: string; level?: 'INFO' | 'WARN' | 'CRITICAL'; tags?: string[] };

export type NotifyTestResponse = { ok: boolean; results: Array<Record<string, unknown>> };

export type JobsStatus = {
  jobs: Array<{ name: string; everyMs: number; lastRun?: string; lastOk?: string; lastError?: string; running: boolean }>;
  flags: { ocoMissing?: boolean };
};
