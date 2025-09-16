import process from 'node:process';
import { syncTicketsFromDisk } from '../jobs/ticketsDiskSync.js';

function parseArgs(argv: string[]): { once: boolean; interval: number; force: boolean } {
  let once = false;
  let interval = 30_000;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--once') {
      once = true;
    } else if (arg === '--watch') {
      once = false;
    } else if (arg.startsWith('--interval=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) interval = value;
    } else if (arg === '--interval' || arg === '-i') {
      const next = argv[i + 1];
      const value = Number(next);
      if (Number.isFinite(value) && value > 0) {
        interval = value;
        i++;
      }
    } else if (arg === '--force') {
      force = true;
    }
  }
  return { once, interval, force };
}

async function runOnce(force: boolean): Promise<void> {
  try {
    await syncTicketsFromDisk({ logger: console, force });
  } catch (err) {
    console.error('[sync-tickets] run failed', err);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await runOnce(args.force);
  if (args.once) return;
  setInterval(() => {
    void runOnce(false);
  }, args.interval);
}

main().catch((err) => {
  console.error('[sync-tickets] fatal error', err);
  process.exitCode = 1;
});
