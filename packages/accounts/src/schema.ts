export type AccountMode = 'eval' | 'funded';

export interface AccountRecord {
  name: string;
  accountId: number;
  accountSpec: string;
  mode: AccountMode;
  planMaxContracts: number;
  baseSize?: number;
  multiplier?: number;
  minQty?: number;
}

export interface AccountsFile {
  accounts: AccountRecord[];
}

export function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}
export function isNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}
export function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

const ALLOWED_KEYS = new Set([
  'name',
  'accountId',
  'accountSpec',
  'mode',
  'planMaxContracts',
  'baseSize',
  'multiplier',
  'minQty',
]);

export function validateAccountsConfig(obj: unknown): AccountsFile {
  if (typeof obj !== 'object' || obj === null) throw new Error('accounts.json: not an object');
  const root = obj as any;

  if (!Array.isArray(root.accounts) || root.accounts.length < 1) {
    throw new Error('accounts.json: "accounts" must be a non-empty array');
  }

  const out: AccountsFile = { accounts: [] };

  for (let i = 0; i < root.accounts.length; i++) {
    const a = root.accounts[i];
    if (typeof a !== 'object' || a === null) {
      throw new Error(`accounts[${i}]: must be an object`);
    }
    // unknown key check
    for (const k of Object.keys(a)) {
      if (!ALLOWED_KEYS.has(k)) throw new Error(`accounts[${i}]: unknown key "${k}"`);
    }

    const name = a.name;
    const accountId = a.accountId;
    const accountSpec = a.accountSpec;
    const mode = a.mode;
    const planMaxContracts = a.planMaxContracts;
    const baseSize = a.baseSize ?? 1;
    const multiplier = a.multiplier ?? 1;
    const minQty = a.minQty ?? 1;

    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`accounts[${i}].name must be a non-empty string`);
    }
    if (!isPositiveInt(accountId))
      throw new Error(`accounts[${i}].accountId must be a positive integer`);
    if (typeof accountSpec !== 'string' || accountSpec.trim() === '') {
      throw new Error(`accounts[${i}].accountSpec must be a non-empty string`);
    }
    if (mode !== 'eval' && mode !== 'funded') {
      throw new Error(`accounts[${i}].mode must be "eval" or "funded"`);
    }
    if (!isPositiveInt(planMaxContracts)) {
      throw new Error(`accounts[${i}].planMaxContracts must be a positive integer`);
    }
    if (!isPositiveInt(baseSize)) {
      throw new Error(`accounts[${i}].baseSize must be a positive integer`);
    }
    if (!isFiniteNum(multiplier) || multiplier <= 0) {
      throw new Error(`accounts[${i}].multiplier must be a positive number`);
    }
    if (!isNonNegativeInt(minQty)) {
      throw new Error(`accounts[${i}].minQty must be an integer >= 0`);
    }

    out.accounts.push({
      name,
      accountId,
      accountSpec,
      mode,
      planMaxContracts,
      baseSize,
      multiplier,
      minQty,
    });
  }

  return out;
}
