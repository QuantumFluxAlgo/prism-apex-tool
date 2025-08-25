import { listAccounts, readAccount, upsertAccount, type AccountFile } from '@prism-apex-tool/accounts';
import path from 'node:path';

function dataDir(): string {
  return process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
}

export const Accounts = {
  list: () => listAccounts(dataDir()),
  get: (id: string) => readAccount(dataDir(), id),
  upsert: (input: Partial<AccountFile> & { id: string }) => upsertAccount(dataDir(), input),
};
