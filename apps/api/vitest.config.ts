import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths() // map TS path aliases for vitest/vite
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['test.setup.ts'],
    testTimeout: 20000,
    coverage: { reporter: ['text-summary', 'lcov'] }
  },
  esbuild: { target: 'es2022' }
});
