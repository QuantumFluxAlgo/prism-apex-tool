import path from 'node:path';

const DEFAULT_DATA_DIR = '/var/lib/prism-apex-tool';

export function resolveDataDir(): string {
  return process.env.DATA_DIR || process.env.APEX_DATA_DIR || DEFAULT_DATA_DIR;
}

export function resolveTicketsDir(): string {
  return process.env.TICKETS_DIR || path.join(resolveDataDir(), 'tickets');
}

export { DEFAULT_DATA_DIR };
