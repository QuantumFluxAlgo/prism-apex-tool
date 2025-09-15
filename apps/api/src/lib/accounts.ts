import { loadAccounts, type AccountsFile, type AccountRecord } from '@prism-apex/accounts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function dataDir(): string {
  return process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
}
function filePath(): string {
  return path.join(dataDir(), 'accounts.json');
}
function ensureStore(): void {
  const dir = dataDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fp = filePath();
  if (!existsSync(fp)) writeFileSync(fp, JSON.stringify({ accounts: [] } satisfies AccountsFile, null, 2));
}

export const Accounts = {
  list(): AccountRecord[] {
    try {
      ensureStore();
      return loadAccounts(filePath()).accounts;
    } catch {
      ensureStore();
      return [];
    }
  },

  get(id: string): AccountRecord | undefined {
    const all = Accounts.list();
    return all.find(a => String(a.accountId) === id || a.name === id);
  },

  upsert(input: Partial<AccountRecord> & { id: string }): AccountRecord {
    ensureStore();
    const fp = filePath();
    let current: AccountsFile;
    try { current = loadAccounts(fp) as AccountsFile; }
    catch { current = { accounts: [] } as AccountsFile; }
    const idx = current.accounts.findIndex(a => String(a.accountId) === input.id || a.name === input.id);
    const base: AccountRecord = idx >= 0
      ? current.accounts[idx]
      : {
          name: input.id,
          accountId: Number(input.id) || 0,
          accountSpec: input.accountSpec ?? '',
          mode: (input.mode as AccountRecord['mode']) ?? 'eval',
          planMaxContracts: input.planMaxContracts ?? 1,
          baseSize: input.baseSize ?? 1,
          multiplier: input.multiplier,
          minQty: input.minQty,
        };
    const next: AccountRecord = { ...base, ...input, name: input.name ?? base.name };
    if (idx >= 0) current.accounts[idx] = next; else current.accounts.push(next);
    writeFileSync(fp, JSON.stringify(current, null, 2));
    return next;
  },
};
