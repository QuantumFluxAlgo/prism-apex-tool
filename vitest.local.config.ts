import { defineConfig, defineProject, configDefaults } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  projects: [
    // Dashboard / web UI tests (DOM needed)
    defineProject({
      test: {
        name: 'web',
        environment: 'jsdom',
        globals: true,
        setupFiles: ['tests/setup/vitest.setup.ts'],
        include: [
          'apps/**/__tests__/**/*.test.{ts,tsx,js,jsx}',
          'apps/**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
        ],
        exclude: [
          ...configDefaults.exclude,
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          'apps/**/tests/e2e/**',
          'apps/**/e2e/**',
        ],
        maxThreads: 1,
        minThreads: 1,
        testTimeout: 12000,
        hookTimeout: 12000,
        alias: { '@': path.resolve(__dirname, './') },
      },
    }),
    // Everything else (packages, services): Node
    defineProject({
      test: {
        name: 'node',
        environment: 'node',
        globals: true,
        setupFiles: ['tests/setup/vitest.setup.ts'],
        include: [
          '**/__tests__/**/*.test.{ts,tsx,js,jsx}',
          '?(*.)+(spec|test).{ts,tsx,js,jsx}',
        ],
        exclude: [
          ...configDefaults.exclude,
          'apps/**', // handled by web project
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          'apps/**/tests/e2e/**',
          'apps/**/e2e/**',
        ],
        maxThreads: 1,
        minThreads: 1,
        testTimeout: 10000,
        hookTimeout: 10000,
        alias: { '@': path.resolve(__dirname, './') },
      },
    }),
  ],
});
