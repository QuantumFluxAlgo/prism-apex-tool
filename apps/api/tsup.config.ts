import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  splitting: false,
  skipNodeModulesBundle: true,
  env: {
    NODE_ENV: 'production'
  }
});
