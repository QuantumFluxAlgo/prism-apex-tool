import { describe, expect, it, vi } from 'vitest';
import {
  buildFanoutOrders,
  fanoutAndPlace,
  type FanoutInput,
  type BrokerClient,
} from '../src/fanout.js';

const mockAccounts = vi.hoisted(() => [
  {
    name: 'PA-1',
    accountId: 1,
    accountSpec: 'A1',
    mode: 'funded',
    planMaxContracts: 10,
    baseSize: 2,
  },
  {
    name: 'PA-2',
    accountId: 2,
    accountSpec: 'A2',
    mode: 'funded',
    planMaxContracts: 10,
    baseSize: 2,
  },
]);
vi.mock('@prism-apex/accounts', () => ({ getAccounts: () => mockAccounts }));
const guard = vi.hoisted(() => vi.fn());
vi.mock('@prism-apex/rules/apex.js', () => ({ guardApexFundingRules: guard }));

interface AccountRecord {
  name: string;
  accountId: number;
  accountSpec: string;
  mode: 'eval' | 'funded';
  planMaxContracts: number;
  baseSize: number;
  multiplier?: number;
  minQty?: number;
}

describe('deterministic fanout, two accounts', () => {
  it('builds stable orders with multipliers', () => {
    const accounts: AccountRecord[] = [
      {
        name: 'PA-1',
        accountId: 1,
        accountSpec: 'A1',
        mode: 'funded',
        planMaxContracts: 10,
        baseSize: 2,
        multiplier: 1.0,
        minQty: 1,
      },
      {
        name: 'PA-2',
        accountId: 2,
        accountSpec: 'A2',
        mode: 'funded',
        planMaxContracts: 10,
        baseSize: 2,
        multiplier: 1.5,
        minQty: 1,
      },
    ];
    const input: FanoutInput = {
      intent: { symbol: 'ES', side: 'Buy', entryPrice: 10, qty: 2 },
      telemetryByAccount: {},
    };
    const orders = buildFanoutOrders(input, accounts);
    expect(orders.map((o) => o.account.name)).toEqual(['PA-1', 'PA-2']);
    expect(orders.map((o) => o.ticket.qty)).toEqual([2, 3]);
  });
});

describe('cap by plan & minQty', () => {
  it('clamps to planMaxContracts and minQty', () => {
    const accounts: AccountRecord[] = [
      {
        name: 'A1',
        accountId: 1,
        accountSpec: 'A1',
        mode: 'funded',
        planMaxContracts: 4,
        baseSize: 2,
        multiplier: 3,
        minQty: 1,
      },
      {
        name: 'A2',
        accountId: 2,
        accountSpec: 'A2',
        mode: 'funded',
        planMaxContracts: 10,
        baseSize: 2,
        multiplier: 0.1,
        minQty: 1,
      },
      {
        name: 'A3',
        accountId: 3,
        accountSpec: 'A3',
        mode: 'funded',
        planMaxContracts: 10,
        baseSize: 2,
        multiplier: 0.1,
        minQty: 0,
      },
    ];
    const input: FanoutInput = {
      intent: { symbol: 'ES', side: 'Buy', entryPrice: 10 },
      telemetryByAccount: {},
    };
    const orders = buildFanoutOrders(input, accounts);
    expect(orders.map((o) => o.account.name)).toEqual(['A1', 'A2']);
    expect(orders.map((o) => o.ticket.qty)).toEqual([4, 1]);
  });
});

describe('error isolation', () => {
  it('continues after broker error', async () => {
    guard.mockReset();
    guard.mockReturnValue({ allow: true, ticket: { qty: 2 } });
    const placeOrder = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, id: '1' })
      .mockRejectedValueOnce(new Error('fail'));
    const broker: BrokerClient = { placeOrder };
    const res = await fanoutAndPlace(
      { intent: { symbol: 'ES', side: 'Buy', entryPrice: 10, qty: 2 }, telemetryByAccount: {} },
      broker,
    );
    expect(res.results).toEqual([
      { account: 'PA-1', ok: true, id: '1' },
      { account: 'PA-2', ok: false, error: 'Error: fail' },
    ]);
  });
});

describe('guard invocation', () => {
  it('records guard denial per account', async () => {
    const accounts = mockAccounts as AccountRecord[];
    guard.mockReset();
    guard
      .mockReturnValueOnce({ allow: true, ticket: { qty: 2 } })
      .mockReturnValueOnce({ allow: false, reason: 'DENIED' });
    const placeOrder = vi.fn().mockResolvedValue({ ok: true, id: '1' });
    const broker: BrokerClient = { placeOrder };
    const res = await fanoutAndPlace(
      { intent: { symbol: 'ES', side: 'Buy', entryPrice: 10, qty: 2 }, telemetryByAccount: {} },
      broker,
    );
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(placeOrder).toHaveBeenCalledWith(
      accounts[0],
      expect.objectContaining({ isAutomated: true }),
    );
    expect(res.results).toEqual([
      { account: 'PA-1', ok: true, id: '1' },
      { account: 'PA-2', ok: false, reason: 'DENIED' },
    ]);
    expect(guard).toHaveBeenCalledTimes(2);
  });
});
