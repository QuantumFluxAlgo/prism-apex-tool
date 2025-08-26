import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function getVersion(): string {
  const pkgPath = resolve(__dirname, '..', '..', '..', '..', 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '';
  } catch {
    return '';
  }
}
