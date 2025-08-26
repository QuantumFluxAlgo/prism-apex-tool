import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = buildServer();
  const address = await app.listen({ port, host });
  app.log.info({ address }, 'Prism Apex Tool API listening');

  const shutdown = async (signal: string) => {
    try {
      app.log.info({ signal }, 'shutting down');
      await app.close(); // triggers onClose hook -> stops jobs
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'graceful shutdown failed');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
   
  console.error(err);
  process.exit(1);
});
