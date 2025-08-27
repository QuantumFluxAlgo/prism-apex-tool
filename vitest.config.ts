import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'build'],
  },
});
