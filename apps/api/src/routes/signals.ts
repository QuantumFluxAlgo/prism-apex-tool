import { FastifyPluginAsync } from "fastify";

export const signalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/signals/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "signals", mode: "disabled" });
  });

  app.get("/tickets", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "signals-disabled" });
  });

  app.post("/tickets/commit", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "signals-disabled" });
  });

  app.all("/signals/*", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "signals-disabled" });
  });
};

export default signalRoutes;
