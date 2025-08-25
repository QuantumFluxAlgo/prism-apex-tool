import path from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import { expect, test } from 'vitest';
import { accountPath, listAccounts, readAccount, upsertAccount } from '../src/fs.js';
import type { AccountFile } from '../src/types.js';

async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(tmpdir(), 'accounts-test-'));
}

test('add then get → matches schema; updatedAt set', async () => {
  const dir = await tempDir();
  const acct = await upsertAccount(dir, { id: 'A1', maxContracts: 5 });
  expect(acct.id).toBe('A1');
  expect(acct.maxContracts).toBe(5);
  expect(acct.bufferCleared).toBe(false);
  expect(typeof acct.updatedAt).toBe('string');
  const read = await readAccount(dir, 'A1');
  expect(read).toEqual(acct);
});

test('set --cleared true persists', async () => {
  const dir = await tempDir();
  await upsertAccount(dir, { id: 'A1', maxContracts: 1 });
  await upsertAccount(dir, { id: 'A1', bufferCleared: true });
  const read = await readAccount(dir, 'A1');
  expect(read?.bufferCleared).toBe(true);
});

test('list returns all files', async () => {
  const dir = await tempDir();
  await upsertAccount(dir, { id: 'A1', maxContracts: 1 });
  await upsertAccount(dir, { id: 'A2', maxContracts: 2 });
  const list = await listAccounts(dir);
  const ids = list.map((a) => a.id).sort();
  expect(ids).toEqual(['A1', 'A2']);
});

test('atomic write leaves valid JSON', async () => {
  const dir = await tempDir();
  await upsertAccount(dir, { id: 'A1', maxContracts: 1 });
  const file = accountPath(dir, 'A1');
  const data = JSON.parse(await fs.readFile(file, 'utf8')) as AccountFile;
  expect(data.id).toBe('A1');
  const tmp = path.join(path.dirname(file), '.A1.tmp');
  await expect(fs.access(tmp)).rejects.toBeTruthy();
});
