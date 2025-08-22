import { test, expect, request } from "@playwright/test";

const DASH = process.env.BASE_DASHBOARD_URL ?? "http://localhost:3000";
const API  = process.env.BASE_API_URL ?? "http://localhost:8000";

test("dashboard root responds 200", async ({ page }) => {
  const resp = await page.goto(DASH, { waitUntil: "domcontentloaded" });
  expect(resp?.status(), "dashboard HTTP status").toBe(200);
});

test("API responds (<500) on root or health", async () => {
  const ctx = await request.newContext();
  // Try /health, fall back to /
  const health = await ctx.get(`${API}/health`);
  const res = health.status() !== 404 ? health : await ctx.get(`${API}/`);
  expect(res.status(), "API status").toBeLessThan(500);
});
