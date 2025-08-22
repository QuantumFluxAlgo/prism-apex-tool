import { FastifyPluginAsync } from "fastify";

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get("/export/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "export", mode: "disabled" });
  });

  app.all("/export/*", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "export-disabled" });
  });
};

export default exportRoutes;
