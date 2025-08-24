import Fastify from "fastify";

async function main() {
  const port = Number(process.env.PORT || 3000);
  const app = Fastify({ logger: true });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  app.get("/health", async () => ({ ok: true }));

  app.get("/metrics", async () => ({
    uptime: Math.round(process.uptime()),
    now: new Date().toISOString()
  }));

  app.get("/opportunities", async () => ({
    items: []
  }));

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

