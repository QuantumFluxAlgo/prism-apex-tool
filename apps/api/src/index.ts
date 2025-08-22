import { buildServer } from "./server";
import { getConfig } from "./config/env";

const cfg = getConfig();

async function main() {
  const app = buildServer();

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
    await app.listen({ port: cfg.port, host: cfg.host });
    app.log.info(`API listening on ${cfg.host}:${cfg.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
