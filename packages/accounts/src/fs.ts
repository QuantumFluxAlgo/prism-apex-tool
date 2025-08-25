import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AccountFile } from './types.js';

const DEFAULT_DATA_DIR = process.env.DATA_DIR ?? './data';

export function accountPath(dataDir: string = DEFAULT_DATA_DIR, id: string): string {
  return path.join(dataDir, 'accounts', `${id}.json`);
}

export async function ensureDir(dataDir: string = DEFAULT_DATA_DIR): Promise<string> {
  const dir = path.join(dataDir, 'accounts');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function validate(acct: AccountFile): void {
  if (!acct.id) throw new Error('id required');
  if (typeof acct.maxContracts !== 'number') throw new Error('maxContracts required');
  if (typeof acct.bufferCleared !== 'boolean') throw new Error('bufferCleared required');
  if (acct.notes !== undefined && typeof acct.notes !== 'string')
    throw new Error('notes must be string');
}

export async function listAccounts(dataDir: string = DEFAULT_DATA_DIR): Promise<AccountFile[]> {
  const dir = await ensureDir(dataDir);
  const files = await fs.readdir(dir);
  const accounts: AccountFile[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(dir, file), 'utf8');
      const acct = JSON.parse(content) as AccountFile;
      validate(acct);
      accounts.push(acct);
    } catch {
      /* skip invalid */
    }
  }
  return accounts;
}

export async function readAccount(
  dataDir: string = DEFAULT_DATA_DIR,
  id: string,
): Promise<AccountFile | undefined> {
  const file = accountPath(dataDir, id);
  try {
    const content = await fs.readFile(file, 'utf8');
    const acct = JSON.parse(content) as AccountFile;
    validate(acct);
    return acct;
  } catch (err: any) {
    if (err && err.code === 'ENOENT') return undefined;
    throw err;
  }
}

export async function writeAccount(
  dataDir: string = DEFAULT_DATA_DIR,
  acct: AccountFile,
): Promise<void> {
  const dir = await ensureDir(dataDir);
  validate(acct);
  acct.updatedAt = new Date().toISOString();
  const finalPath = path.join(dir, `${acct.id}.json`);
  const tmpPath = path.join(dir, `.${acct.id}.tmp`);
  const data = JSON.stringify(acct, null, 2);
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, finalPath);
}

export async function upsertAccount(
  dataDir: string = DEFAULT_DATA_DIR,
  input: { id: string; maxContracts?: number; bufferCleared?: boolean; notes?: string },
): Promise<AccountFile> {
  const existing = await readAccount(dataDir, input.id);
  const acct: AccountFile = {
    id: input.id,
    maxContracts: input.maxContracts ?? existing?.maxContracts ?? 0,
    bufferCleared: input.bufferCleared ?? existing?.bufferCleared ?? false,
    notes: input.notes ?? existing?.notes,
    updatedAt: '',
  };
  await writeAccount(dataDir, acct);
  return acct;
}
