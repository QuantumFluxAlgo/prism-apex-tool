/* eslint-disable no-console */
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  return {
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      include: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
      exclude: ['node_modules', 'dist', 'build'],
    },
  };
});
