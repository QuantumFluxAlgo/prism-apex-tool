import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@prism-apex/data-yahoo': resolve(__dirname, '..', '..', 'packages', 'data-yahoo', 'src'),
      '@prism-apex/risk-state': resolve(__dirname, '..', '..', 'packages', 'risk-state', 'src'),
      '@prism-apex/strategy-apx-ddb01': resolve(
        __dirname,
        '..',
        '..',
        'packages',
        'strategy-apx-ddb01',
        'src',
      ),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    watch: false,
    passWithNoTests: false,
  },
});
