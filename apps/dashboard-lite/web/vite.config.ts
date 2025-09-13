import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Use only built-ins; if plugin-react not present, omit. We'll keep pure react via Vite defaults.
export default defineConfig({
  plugins: [react()],
  server: { port: 5179 },
});
