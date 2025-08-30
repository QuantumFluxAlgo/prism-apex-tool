import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { listJobStatus, runJobNow } from "../jobs/scheduler.js";
import { jobManager } from "../lib/jobManager.js";

export const jobsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // List scheduler + manager jobs
  app.get("/jobs", async () => ({
    scheduler: listJobStatus(),
    manager: jobManager.status(),
  }));

  // Manually trigger a scheduler job once
  app.post("/jobs/:name/run", async (req, reply) => {
    const { name } = req.params as { name: string };
    const ok = await runJobNow(name);
    if (!ok) return reply.code(404).send({ error: "unknown-or-running" });
    return { ok: true };
  });

  // Run all scheduler jobs once
  app.post("/jobs/run-all", async () => {
    const names = listJobStatus().map(j => j.name);
    const ran = await Promise.all(names.map(n => runJobNow(n)));
    return { ok: true, ran: names.filter((_, i) => ran[i]) };
  });  // GET alias to run all scheduler jobs once
  app.get('/jobs/run-all', async () => {
    const names = listJobStatus().map(j => j.name);
    const ran = await Promise.all(names.map(n => runJobNow(n)));
    return { ok: true, ran: names.filter((_, i) => ran[i]) };
  });
};

export default jobsRoutes;
