import { readFileSync } from 'node:fs';
import path from 'node:path';

export type AccountMode = 'eval' | 'funded';

export interface AccountRecord {
  name: string;
  accountId: number;
  accountSpec: string;
  mode: AccountMode;
  planMaxContracts: number;
  baseSize: number;
  multiplier?: number;
  minQty?: number;
}

export interface AccountsFile {
  accounts: AccountRecord[];
}

function validateRecord(a: AccountRecord): void {
  if (!a.name) throw new Error('name required');
  if (typeof a.accountId !== 'number') throw new Error('accountId must be number');
  if (!a.accountSpec) throw new Error('accountSpec required');
  if (a.mode !== 'eval' && a.mode !== 'funded') throw new Error('mode invalid');
  if (typeof a.planMaxContracts !== 'number') throw new Error('planMaxContracts required');
  if (typeof a.baseSize !== 'number') throw new Error('baseSize required');
  if (a.multiplier !== undefined && typeof a.multiplier !== 'number')
    throw new Error('multiplier must be number');
  if (a.minQty !== undefined && typeof a.minQty !== 'number')
    throw new Error('minQty must be number');
}

export function loadAccounts(
  filePath: string = path.resolve('configs/accounts.json'),
): AccountsFile {
  const data = JSON.parse(readFileSync(filePath, 'utf8')) as AccountsFile;
  if (!Array.isArray(data.accounts)) throw new Error('accounts must be array');
  for (const a of data.accounts) validateRecord(a);
  return data;
}

export function getAccounts(): AccountRecord[] {
  return loadAccounts().accounts;
}
