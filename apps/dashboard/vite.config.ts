// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.VITE_API_BASE || 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    proxy: {
      // the dashboard fetches /api/compat/* — rewrite it to API /compat/*
      '/api/compat': {
        target: API,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/compat/, '/compat'),
      },

      // direct API passthroughs
      '/compat': { target: API, changeOrigin: true },
      '/tickets': { target: API, changeOrigin: true },
      '/telemetry': { target: API, changeOrigin: true },
      '/ready': { target: API, changeOrigin: true },
      '/export': { target: API, changeOrigin: true },
      '/version': { target: API, changeOrigin: true },
      '/health': { target: API, changeOrigin: true },
    },
  },
});
