import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['test/**/*.test.tsx'], watch: false, passWithNoTests: false },
});
