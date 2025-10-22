/* eslint-disable no-console */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// eslint-disable-next-line import/no-extraneous-dependencies

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  return {
    plugins: [react(), tsconfigPaths()],
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/__tests__/**/*.ts?(x)'],
      setupFiles: ['src/__tests__/setup.ts'],
    },
  };
});
