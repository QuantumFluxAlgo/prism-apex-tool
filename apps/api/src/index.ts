import { buildServer } from "./server";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = buildServer();

  // Stable health endpoint: 200 if the server is up and ready to accept requests.
  app.get("/health", async (_req, reply) => {
    // Lightweight payload; avoid leaking env or secrets.
    return reply.code(200).send({ ok: true, service: "api", port: PORT });
  });

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    try {
      app.log.info({ signal }, "Shutting down gracefully…");
      await app.close(); // Closes server and registered resources/plugins
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
