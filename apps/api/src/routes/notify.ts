import { FastifyPluginAsync } from "fastify";

export const notifyRoutes: FastifyPluginAsync = async (app) => {
  // Simple ping so we can confirm the plugin is mounted
  app.get("/notify/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "notify", mode: "disabled" });
  });

  // Placeholder for email notifications — disabled after cleanup
  app.post("/notify/email", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "notify-disabled" });
  });
};

export default notifyRoutes;
