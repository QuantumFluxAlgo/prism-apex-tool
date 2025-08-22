import { buildServer } from "./server";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
