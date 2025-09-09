import { defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';

// Extend project defaults in a local-only config.
// CI remains on the default 'vitest.config.ts'.
export default defineConfig({
  test: {
    setupFiles: ['tests/setup/vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
    exclude: [
      ...configDefaults.exclude,
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ],
    // Single-threaded to reduce flakiness from shared state
    maxThreads: 1,
    minThreads: 1,
    testTimeout: 10000,
    hookTimeout: 10000,
    // Resolve aliases if your project uses them (safe defaults)
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
