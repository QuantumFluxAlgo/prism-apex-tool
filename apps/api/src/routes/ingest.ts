import { FastifyPluginAsync } from "fastify";

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ingest/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "ingest", mode: "disabled" });
  });

  app.all("/ingest/*", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "ingest-disabled" });
  });
};

export default ingestRoutes;
