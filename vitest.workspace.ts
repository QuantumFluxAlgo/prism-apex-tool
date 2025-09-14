import { defineWorkspace } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Two projects: node (libs/api), jsdom (UIs)
// Each project picks up tsconfig path aliases via plugin.
export default defineWorkspace([
  {
    test: {
      name: 'node',
      environment: 'node',
      include: [
        'packages/**/?(*.)+(test|spec).{ts,tsx}',
        'apps/api/**/?(*.)+(test|spec).{ts,tsx}'
      ],
      globals: true
    },
    plugins: [tsconfigPaths()]
  },
  {
    test: {
      name: 'jsdom',
      environment: 'jsdom',
      include: [
        'apps/dashboard/**/?(*.)+(test|spec).{ts,tsx}',
        'apps/dashboard-lite/**/?(*.)+(test|spec).{ts,tsx}'
      ],
      globals: true
    },
    plugins: [tsconfigPaths()]
  }
])
