import { describe, it, expect, vi, beforeEach } from 'vitest';

// Target fan-out + place entrypoint
import * as fanoutMod from '../src/fanout.js';

// If fanoutAndPlace uses getAccounts() internally, we’ll stub it:
import * as accounts from '@prism-apex/accounts';

// Types (align with your code if names differ)
type AccountMode = 'eval' | 'funded';

interface AccountRecord {
  name: string;
  accountId: number;
  accountSpec: string;
  mode: AccountMode;
  planMaxContracts: number;
  baseSize?: number;
  multiplier?: number;
  minQty?: number;
}

interface TicketIntent {
  symbol: string;
  side: 'Buy' | 'Sell';
  entryPrice: number;
  qty?: number;
  takeProfit?: number;
  stopLoss?: number;
}

interface AccountTelemetry {
  startingBalance: number;
  currentBalance: number;
  trailingDrawdown: number;
  drawdownStopLocksAt?: number;
  maxContractsAllowed: number;
}

function mkFunded(name: string): AccountRecord {
  return {
    name,
    accountId: Math.floor(Math.random() * 1e6),
    accountSpec: `${name}-SPEC`,
    mode: 'funded',
    planMaxContracts: 10,
    baseSize: 2,
    multiplier: 1,
    minQty: 1,
  };
}

function mkEval(name: string): AccountRecord {
  return { ...mkFunded(name), mode: 'eval' as const };
}

const telemetry: Record<string, AccountTelemetry> = {
  'PA-1': {
    startingBalance: 50000,
    currentBalance: 50000,
    trailingDrawdown: 2500,
    maxContractsAllowed: 10,
  },
  'PA-2': {
    startingBalance: 50000,
    currentBalance: 50000,
    trailingDrawdown: 2500,
    maxContractsAllowed: 10,
  },
};

describe('Guard integration smoke tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks funded ticket with missing stop BEFORE broker.placeOrder is called', async () => {
    // Arrange accounts: PA-1 funded only (to keep assertions simple)
    const accs: AccountRecord[] = [mkFunded('PA-1')];

    // Stub getAccounts() used by fanoutAndPlace (if applicable)
    if ((accounts as any).getAccounts) {
      vi.spyOn(accounts as any, 'getAccounts').mockReturnValue(accs);
    }

    // Broker mock: fail if called (it should NOT be called on guard block)
    const broker = {
      placeOrder: vi.fn().mockResolvedValue({ ok: true, id: 'SHOULD_NOT_BE_CALLED' }),
    };

    // Ticket missing stopLoss in FUNDED mode → must be blocked by guard
    const intent: TicketIntent = {
      symbol: 'MESU5',
      side: 'Buy',
      entryPrice: 5000,
      qty: 2,
      takeProfit: 5010, // present just to compute RR
      // stopLoss: missing on purpose
    };

    // Act
    const res = await (fanoutMod as any).fanoutAndPlace(
      {
        intent,
        telemetryByAccount: { 'PA-1': telemetry['PA-1'] },
        signalId: 'sig-1',
      },
      broker,
    );

    // Assert: broker not called; result shows blocked/error for PA-1
    expect(broker.placeOrder).not.toHaveBeenCalled();
    expect(res?.results?.length).toBe(1);
    const r = res.results[0];
    expect(r.ok).toBeFalsy();
    // reason text can vary by implementation; just assert it exists
    expect(r.reason ?? r.error).toBeTruthy();
  });

  it('allows eval ticket without stop and DOES call broker', async () => {
    const accs: AccountRecord[] = [mkEval('PA-2')];
    if ((accounts as any).getAccounts) {
      vi.spyOn(accounts as any, 'getAccounts').mockReturnValue(accs);
    }

    const broker = {
      placeOrder: vi.fn().mockResolvedValue({ ok: true, id: 'ORDER-123' }),
    };

    const intent: TicketIntent = {
      symbol: 'MESU5',
      side: 'Sell',
      entryPrice: 5000,
      qty: 1,
      // no stopLoss on purpose; eval should pass-through
    };

    const res = await (fanoutMod as any).fanoutAndPlace(
      {
        intent,
        telemetryByAccount: { 'PA-2': telemetry['PA-2'] },
        signalId: 'sig-2',
      },
      broker,
    );

    expect(broker.placeOrder).toHaveBeenCalledTimes(1);
    expect(res?.results?.[0]?.ok).toBeTruthy();
  });
});
