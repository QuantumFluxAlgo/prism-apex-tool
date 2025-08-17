/* eslint-disable import/no-default-export */
/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
