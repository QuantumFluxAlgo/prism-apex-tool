import { FastifyPluginAsync } from "fastify";

export const reportRoutes: FastifyPluginAsync = async (app) => {
  // Simple ping so we can confirm the plugin is mounted
  app.get("/report/ping", async (_req, reply) => {
    return reply.code(200).send({ ok: true, service: "report", mode: "disabled" });
  });

  // Placeholder for export/report operations — disabled after cleanup
  app.all("/report/*", async (_req, reply) => {
    return reply.code(501).send({ ok: false, reason: "reporting-disabled" });
  });
};

export default reportRoutes;
