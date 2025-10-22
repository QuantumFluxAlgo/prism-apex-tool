/* eslint-disable no-console */
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  return {
    plugins: [
      tsconfigPaths(), // map TS path aliases for vitest/vite
    ],
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.ts'],
      exclude: ['node_modules', 'dist'],
      setupFiles: ['test.setup.ts'],
      testTimeout: 20000,
      coverage: { reporter: ['text-summary', 'lcov'] },
    },
    esbuild: { target: 'es2022' },
  };
});
