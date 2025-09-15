import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ['test/**/*.test.tsx'], watch: false, passWithNoTests: false },
});
