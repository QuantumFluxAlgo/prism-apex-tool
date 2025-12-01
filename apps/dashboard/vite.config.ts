import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const sharedDist = path.resolve(__dirname, '../../packages/shared/dist');

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      { find: /^@prism-apex\/shared$/, replacement: path.join(sharedDist, 'index.js') },
      { find: /^@prism-apex\/shared\//, replacement: `${sharedDist}/` },
    ],
  },
  build: { sourcemap: false }
});
