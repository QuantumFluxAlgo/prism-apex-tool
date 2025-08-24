import Fastify from "fastify";

async function main() {
  const port = Number(process.env.PORT ?? 3000);
  const app = Fastify({ logger: true });

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

