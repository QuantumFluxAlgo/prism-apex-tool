import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'build'],
  },
});
