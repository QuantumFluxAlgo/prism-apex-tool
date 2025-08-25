#!/usr/bin/env node
import { listAccounts, readAccount, upsertAccount } from './fs.js';

function parseArgs(argv: string[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      opts[key] = value;
    }
  }
  return opts;
}

function help(): void {
  console.log(`Usage: prism-accounts <command> [options]

Commands:
  list
  add --id <id> --max <n> [--cleared true|false] [--notes "..."]
  set --id <id> [--max <n>] [--cleared true|false] [--notes "..."]
  get --id <id>

Options:
  --data-dir <path>
`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help') {
    help();
    process.exit(0);
  }
  const opts = parseArgs(rest);
  const dataDir = opts['data-dir'] ?? process.env.DATA_DIR ?? './data';
  try {
    switch (cmd) {
      case 'list': {
        const accounts = await listAccounts(dataDir);
        console.log(JSON.stringify(accounts, null, 2));
        break;
      }
      case 'add': {
        const id = opts['id'];
        const max = opts['max'];
        if (!id || max === undefined) throw new Error('id and max required');
        const cleared = opts['cleared'] ? opts['cleared'] === 'true' : undefined;
        const acct = await upsertAccount(dataDir, {
          id,
          maxContracts: Number(max),
          bufferCleared: cleared,
          notes: opts['notes'],
        });
        console.log(JSON.stringify(acct, null, 2));
        break;
      }
      case 'set': {
        const id = opts['id'];
        if (!id) throw new Error('id required');
        const cleared = opts['cleared'] ? opts['cleared'] === 'true' : undefined;
        const acct = await upsertAccount(dataDir, {
          id,
          maxContracts: opts['max'] !== undefined ? Number(opts['max']) : undefined,
          bufferCleared: cleared,
          notes: opts['notes'],
        });
        console.log(JSON.stringify(acct, null, 2));
        break;
      }
      case 'get': {
        const id = opts['id'];
        if (!id) throw new Error('id required');
        const acct = await readAccount(dataDir, id);
        if (!acct) throw new Error('not found');
        console.log(JSON.stringify(acct, null, 2));
        break;
      }
      default:
        help();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
