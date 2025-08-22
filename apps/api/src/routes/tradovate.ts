import { FastifyPluginAsync } from "fastify";
import { getConfig } from "../config/env";

const tradovateRoutes: FastifyPluginAsync = async (app) => {
  const cfg = getConfig();

  app.get("/tradovate/ping", async (_req, reply) => {
    return reply.code(200).send({
      ok: true,
      service: "tradovate",
      mode: cfg.tradovate.mock ? "mock" : "live"
    });
  });

  // NOTE: We'll wire real endpoints (orders/positions/tickets) later.
  // For now, this stable ping lets CI/local runs verify the integration path.
};

export default tradovateRoutes;
