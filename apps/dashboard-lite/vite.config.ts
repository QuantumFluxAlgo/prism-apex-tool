import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: UI on 5179; proxy API to Express on 5178
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5178', changeOrigin: true },
    },
  },
  preview: { port: 5179, strictPort: true },
});
