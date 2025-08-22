import { FastifyPluginAsync } from "fastify";

export const rulesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/rules/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "rules", mode: "disabled" });
  });

  app.all("/rules/*", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "rules-disabled" });
  });
};

export default rulesRoutes;
