import { defineConfig } from 'vitest/config';
// eslint-disable-next-line import/no-extraneous-dependencies

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  return {
    plugins: [tsconfigPaths()],
    test: {
      include: ['test/**/*.test.ts'],
      environment: 'node',
      watch: false,
      passWithNoTests: false,
    },
  };
});
