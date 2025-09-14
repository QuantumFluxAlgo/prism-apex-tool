import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 20000,
    coverage: { reporter: ['text-summary', 'lcov'] }
  },
  esbuild: { target: 'es2022' }
});
