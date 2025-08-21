import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // remove leading /api, then forward to API server
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  esbuild: { jsx: 'automatic', loader: { '.js': 'jsx' } },
});
