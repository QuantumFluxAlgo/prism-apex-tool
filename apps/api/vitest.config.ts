import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: { reporter: ['text', 'json-summary', 'lcov'] },
    setupFiles: [path.resolve(__dirname, './src/tests/setup.ts')],
    include: ['src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['dist/**', 'node_modules/**', 'infra/**', '**/*.d.ts'],
  },
  resolve: {
    alias: {
      '@prism-apex-tool/analytics': path.resolve(
        __dirname,
        '../../packages/analytics/src/index.ts',
      ),
      '@prism-apex-tool/audit': path.resolve(__dirname, '../../packages/audit/src/index.ts'),
      '@prism-apex-tool/reporting': path.resolve(
        __dirname,
        '../../packages/reporting/src/index.ts',
      ),
      '@prism-apex-tool/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@prism-apex-tool/signals': path.resolve(__dirname, '../../packages/signals/src/index.ts'),
      '@prism-apex-tool/rules-apex': path.resolve(
        __dirname,
        '../../packages/rules-apex/src/index.ts',
      ),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
});
