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
        // "/api/x" -> "/compat/x"
        rewrite: (p) => p.replace(/^\/api(?=\/|$)/, '/compat'),
      },
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  esbuild: { jsx: 'automatic', loader: { '.js': 'jsx' } },
});

