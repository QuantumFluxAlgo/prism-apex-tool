import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = path.resolve(__dirname, '../pages');

describe('dashboard pages avoid raw fetch usage', () => {
  const pageFiles = readdirSync(pagesDir).filter((file) => file.endsWith('.tsx'));

  for (const file of pageFiles) {
    it(`${file} does not call fetch directly`, () => {
      const contents = readFileSync(path.join(pagesDir, file), 'utf8');
      if (contents.includes('fetch(')) {
        throw new Error(
          `Raw fetch detected in ${file}; use lib/api helpers instead.`,
        );
      }
      expect(true).toBe(true);
    });
  }
});
