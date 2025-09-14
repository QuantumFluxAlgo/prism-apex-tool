import { defineWorkspace, defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Node-side tests: packages + API
const nodeProject = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: 'node',
    environment: 'node',
    globals: true,
    include: [
      'packages/**/?(*.)+(test|spec).{ts,tsx}',
      'apps/api/**/?(*.)+(test|spec).{ts,tsx}'
    ],
    exclude: [
      'apps/**/tests/e2e/**',
      'apps/**/e2e/**'
    ]
  }
})

// Browser-side tests: dashboards
const jsdomProject = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: 'jsdom',
    environment: 'jsdom',
    globals: true,
    include: [
      'apps/dashboard/**/?(*.)+(test|spec).{ts,tsx}',
      'apps/dashboard-lite/**/?(*.)+(test|spec).{ts,tsx}'
    ]
  }
})

export default defineWorkspace([nodeProject, jsdomProject])
