// eslint-disable-next-line import/no-unresolved
import { buildServer } from './server.js';

const port = Number(process.env.PORT) || 8080;
const app = buildServer();

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${port}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
