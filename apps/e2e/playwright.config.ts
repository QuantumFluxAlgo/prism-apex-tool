import { defineConfig } from "@playwright/test";

const DASH = process.env.BASE_DASHBOARD_URL ?? "http://localhost:3000";
const API  = process.env.BASE_API_URL ?? "http://localhost:8000";

export default defineConfig({
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: DASH
  },
  metadata: {
    dashboard: DASH,
    api: API
  }
});
