import Fastify from "fastify";

async function main() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const app = Fastify({ logger: true });

  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`API listening on ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();

