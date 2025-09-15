import { getAccounts } from '@prism-apex/accounts';
import type { AccountRecord } from '@prism-apex/accounts';
import { guardApexFundingRules } from '@prism-apex/rules/apex.js';

export interface TicketIntent {
  symbol: string;
  side: 'Buy' | 'Sell';
  entryPrice: number;
  qty?: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface AccountTelemetry {
  startingBalance: number;
  currentBalance: number;
  trailingDrawdown: number;
  drawdownStopLocksAt?: number;
  maxContractsAllowed: number;
}

export interface FanoutInput {
  intent: TicketIntent;
  telemetryByAccount: Record<string, AccountTelemetry>;
  signalId?: string;
}

export interface FanoutOrder {
  account: AccountRecord;
  ticket: TicketIntent;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function buildFanoutOrders(input: FanoutInput, accounts: AccountRecord[]): FanoutOrder[] {
  const { intent, telemetryByAccount } = input;
  const sorted = [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  const orders: FanoutOrder[] = [];
  for (const acc of sorted) {
    const tele = telemetryByAccount[acc.name] ?? telemetryByAccount[acc.accountSpec] ?? {};
    const base = intent.qty ?? acc.baseSize;
    const mult = acc.multiplier ?? 1;
    const raw = Math.floor(base * mult);
    const maxAllowed = Math.min(
      acc.planMaxContracts,
      tele.maxContractsAllowed ?? acc.planMaxContracts,
    );
    const derivedQty = clamp(raw, acc.minQty ?? 1, maxAllowed);
    if (derivedQty <= 0) continue;
    orders.push({
      account: acc,
      ticket: { ...intent, qty: derivedQty },
    });
  }
  return orders;
}

export interface BrokerClient {
  placeOrder(
    a: AccountRecord,
    t: TicketIntent & { isAutomated?: boolean },
  ): Promise<{ ok: boolean; id?: string; error?: string }>;
}

export async function fanoutAndPlace(
  input: FanoutInput,
  broker: BrokerClient,
  now: Date = new Date(),
) {
  const accounts = getAccounts();
  const orders = buildFanoutOrders(input, accounts);
  const results: Array<{
    account: string;
    ok: boolean;
    id?: string;
    error?: string;
    reason?: string;
  }> = [];
  for (const o of orders) {
    const tele = input.telemetryByAccount[o.account.name] ?? {};
    const guard = guardApexFundingRules(
      {
        qty: o.ticket.qty ?? 0,
        entryPrice: o.ticket.entryPrice,
        stopLoss: o.ticket.stopLoss,
        takeProfit: o.ticket.takeProfit,
      },
      {
        mode: o.account.mode === 'funded' ? 'funded' : 'evaluation',
        bufferCleared: true,
        maxContractsAllowed: tele.maxContractsAllowed ?? o.account.planMaxContracts,
        now,
      },
    );
    if (!guard.allow) {
      results.push({ account: o.account.name, ok: false, reason: guard.reason });
      continue;
    }
    try {
      const qty = guard.ticket?.qty ?? o.ticket.qty;
      const res = await broker.placeOrder(o.account, {
        ...o.ticket,
        qty,
        isAutomated: true,
      });
      results.push({ account: o.account.name, ...res });
    } catch (err) {
      results.push({ account: o.account.name, ok: false, error: String(err) });
    }
  }
  return { orders, results };
}
