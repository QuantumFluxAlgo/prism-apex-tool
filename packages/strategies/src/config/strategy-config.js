import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(new URL('.', import.meta.url)));
export function loadStrategyConfig(key) {
  const filePath = join(__dirname, '../../../../configs/strategies', `${key}.json`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to load strategy config for ${key}: ${err.message}`);
  }
}
export function mergeParams(defaults, overrides) {
  return { ...defaults, ...(overrides ?? {}) };
}
