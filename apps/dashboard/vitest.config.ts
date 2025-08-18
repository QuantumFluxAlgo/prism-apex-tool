/* eslint-disable import/no-default-export */
/* eslint-disable import/no-unresolved */
/* eslint-disable simple-import-sort/imports */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.ts?(x)'],
  },
});
