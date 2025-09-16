import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import { TicketSchema } from '../schemas/ticket.js';
import type { Ticket } from '../store/tickets.js';
import { saveTicket } from '../store/tickets.js';
import { resolveTicketsDir } from '../utils/dirs.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const processedFiles = new Set<string>();

type Logger = {
  debug?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

export type TicketsSyncOptions = {
  rootDir?: string;
  force?: boolean;
  logger?: Logger;
};

async function readDirSafe(dir: string, logger?: Logger): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err: any) {
    if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') {
      logger?.debug?.({ dir }, 'tickets directory missing');
      return [];
    }
    logger?.error?.({ err, dir }, 'failed to read tickets directory');
    return [];
  }
}

async function loadTicket(file: string, logger?: Logger): Promise<Ticket | null> {
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    logger?.warn?.({ err, file }, 'failed to read ticket file');
    return null;
  }
  if (!raw.trim()) {
    logger?.warn?.({ file }, 'ticket file empty');
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger?.warn?.({ err, file }, 'invalid JSON ticket file');
    return null;
  }
  const result = TicketSchema.safeParse(parsed);
  if (!result.success) {
    logger?.warn?.({ file, issues: result.error.issues }, 'ticket file failed validation');
    return null;
  }
  return result.data;
}

export async function syncTicketsFromDisk(options: TicketsSyncOptions = {}): Promise<number> {
  if (options.force) processedFiles.clear();
  const rootDir = options.rootDir ?? resolveTicketsDir();
  const dayDirs = await readDirSafe(rootDir, options.logger);
  if (dayDirs.length === 0) return 0;

  let processed = 0;
  for (const entry of dayDirs) {
    if (!entry.isDirectory() || !DAY_RE.test(entry.name)) continue;
    const dayDir = path.join(rootDir, entry.name);
    let files: Dirent[] = [];
    try {
      files = await fs.readdir(dayDir, { withFileTypes: true });
    } catch (err) {
      options.logger?.warn?.({ err, dayDir }, 'failed to read tickets day directory');
      continue;
    }
    for (const file of files) {
      if (!file.isFile() || !file.name.toLowerCase().endsWith('.json')) continue;
      const fullPath = path.join(dayDir, file.name);
      if (!options.force && processedFiles.has(fullPath)) continue;
      const ticket = await loadTicket(fullPath, options.logger);
      if (!ticket) {
        processedFiles.add(fullPath);
        continue;
      }
      try {
        await saveTicket(ticket);
        processedFiles.add(fullPath);
        processed++;
      } catch (err) {
        options.logger?.error?.({ err, file: fullPath }, 'failed to save ticket');
      }
    }
  }
  if (processed > 0) {
    options.logger?.info?.({ processed }, 'synced tickets from disk');
  }
  return processed;
}

export async function runTicketsDiskSyncJob(logger?: Logger): Promise<void> {
  await syncTicketsFromDisk({ logger });
}

export function resetTicketsDiskSyncState(): void {
  processedFiles.clear();
}
