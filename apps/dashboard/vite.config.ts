import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const sharedDist = path.resolve(__dirname, '../../packages/shared/dist');
const uiTableSrc = path.resolve(__dirname, '../../packages/ui-table/src');

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      { find: /^@prism-apex\/shared$/, replacement: path.join(sharedDist, 'index.js') },
      { find: /^@prism-apex\/shared\//, replacement: `${sharedDist}/` },
      { find: /^@prism-apex\/ui-table$/, replacement: path.join(uiTableSrc, 'index.ts') },
      { find: /^@prism-apex\/ui-table\//, replacement: `${uiTableSrc}/` },
    ],
  },
  build: { sourcemap: false }
});
