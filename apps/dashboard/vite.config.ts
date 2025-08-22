import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const jsLoader: Record<string, "jsx"> = { ".js": "jsx" };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "")
      }
    }
  },
  optimizeDeps: { esbuildOptions: { loader: jsLoader } },
  esbuild: { jsx: "automatic", loader: jsLoader }
});
