import { describe, it, expect } from 'vitest';
import { validateAccountsConfig } from '../src/schema.js';

describe('accounts schema', () => {
  it('accepts a valid config', () => {
    const cfg = {
      accounts: [
        {
          name: 'PA-1',
          accountId: 123456,
          accountSpec: 'PA123456',
          mode: 'funded',
          planMaxContracts: 10,
          baseSize: 2,
          multiplier: 1.0,
          minQty: 1,
        },
      ],
    };
    const v = validateAccountsConfig(cfg);
    expect(v.accounts[0].name).toBe('PA-1');
  });

  it('rejects unknown keys & bad types', () => {
    expect(() => validateAccountsConfig({})).toThrow();
    expect(() => validateAccountsConfig({ accounts: [] })).toThrow();
    expect(() =>
      validateAccountsConfig({
        accounts: [
          { name: 'X', accountId: 'oops', accountSpec: 'S', mode: 'funded', planMaxContracts: 10 },
        ],
      }),
    ).toThrow(/accountId/);
    expect(() =>
      validateAccountsConfig({
        accounts: [
          {
            name: 'X',
            accountId: 1,
            accountSpec: 'S',
            mode: 'funded',
            planMaxContracts: 10,
            typo: true,
          },
        ],
      }),
    ).toThrow(/unknown key "typo"/);
  });
});
