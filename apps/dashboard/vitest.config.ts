import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',

    // Global setup – this is where we put any jsdom/matchMedia/navigator shims.
    setupFiles: ['./src/__tests__/setup.ts'],

    // Only treat real test/spec files as suites; plain setup.ts is NOT a test.
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx',
      'src/__tests__/**/*.spec.ts',
      'src/__tests__/**/*.spec.tsx',
    ],

    // Keep default exclude, plus node_modules/dist/etc. If you already had
    // custom excludes, we can extend this in a follow-up change.
    exclude: [
      'node_modules',
      'dist',
      '.git',
    ],
  },
});
