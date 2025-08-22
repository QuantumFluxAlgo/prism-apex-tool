import { FastifyPluginAsync } from "fastify";

export const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get("/market/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "market", mode: "disabled" });
  });

  app.all("/account", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "market-disabled" });
  });
  app.all("/positions", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "market-disabled" });
  });
  app.all("/orders", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "market-disabled" });
  });
  app.all("/bars", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "market-disabled" });
  });
  app.all("/last", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "market-disabled" });
  });
};

export default marketRoutes;
