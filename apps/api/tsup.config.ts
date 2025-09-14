import { defineConfig } from 'tsup';

/**
 * If your API entry is not src/server.ts, change the "entry" below.
 */
export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  target: 'node20',
  format: ['cjs'],
  splitting: false,
  treeshake: false,
  dts: false,
  minify: false,
  external: [
    // Keep runtime deps external (installed in image), safer for dynamic imports.
  ]
});
