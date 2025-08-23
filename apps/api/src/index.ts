import { buildServer } from "./server";

async function main() {
  // Hard-bind for Docker reliability
  const port = Number(process.env.PORT ?? 8000);
  const host = "0.0.0.0";

  const app = buildServer();

  // Minimal routes
  app.get("/", async () => ({ ok: true, uptime: process.uptime() }));
  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  // Start
  try {
    const address = await app.listen({ port, host });
    const msg = `➡️  API running at ${address}`;
    app.log?.info?.(msg);
    console.log("\n" + "=".repeat(60));
    console.log(msg);
    console.log("Open this in your browser:");
    console.log(address);
    console.log("Health: " + address.replace(/\/$/, "") + "/health");
    console.log("".padEnd(60, "=") + "\n");
  } catch (err) {
    console.error("❌ Failed to start API:", err);
    process.exit(1);
  }
}

main();
