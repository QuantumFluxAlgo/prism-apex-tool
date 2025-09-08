import type { FastifyBaseLogger } from 'fastify';
import { getConfig } from '../config/env.js';
import { createTradovateDemoClient } from '@prism-apex-tool/clients-tradovate';
const cfg = getConfig();


const clientEnv: ClientEnv = {
  clientId: cfg.tradovate.clientId!,
  username: cfg.tradovate.username!,
  password: cfg.tradovate.password!,
  appId: cfg.tradovate.appId!,
  appVersion: cfg.tradovate.appVersion!,
};
type Ctx = { log: FastifyBaseLogger };

export async function factory(_ctx: Ctx) {
  // Construct absolute login URL from BASE_URL
  const loginUrl = tvUrl('/auth/accesstokenrequest');

  // The clients-tradovate lib likely accepts config; pass absolute url + creds
  const client = await createTradovateDemoClient(clientEnv);

  return {
    async start() {
      // Start your streaming/feed here via `client`
    },
    async stop() {
      // Clean up if your client supports it
    },
  };
}

export const FeedJob = {
  name: 'tradovate-feed',
  async start(ctx: Ctx) {
    if (!env.JOBS_ENABLE_FEED) {
      ctx.log.info('feed job disabled: JOBS_ENABLE_FEED=false');
      return;
    }
    if (!hasTradovateAuth) {
      ctx.log.warn('feed job not started: Tradovate env not fully set');
      return;
    }
    const j = await factory(ctx);
    await j.start();
  },
};
