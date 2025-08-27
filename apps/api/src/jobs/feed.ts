import { createTradovateDemoClient, TradovateClient } from '@prism-apex-tool/clients-tradovate';
import { publish } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';

export const marketFeed = { connected: false, subs: 0 };

export type ClientFactory = () => Promise<TradovateClient>;
let factory: ClientFactory = async () =>
  createTradovateDemoClient({
    restBase: process.env.TRADOVATE_DEMO_REST_BASE || '',
    wsUrl: process.env.TRADOVATE_MD_WS_URL || '',
    appId: process.env.TRADOVATE_APP_ID || '',
    appVersion: process.env.TRADOVATE_APP_VERSION || '',
    user: process.env.TRADOVATE_USER || '',
    password: process.env.TRADOVATE_PASSWORD || '',
    cid: process.env.TRADOVATE_API_CID || '',
    sec: process.env.TRADOVATE_API_SEC || '',
    deviceId: process.env.TRADOVATE_DEVICE_ID || '',
  });

export function setClientFactory(f: ClientFactory) {
  factory = f;
}

let client: TradovateClient | null = null;

async function start(): Promise<void> {
  client = await factory();
  marketFeed.connected = true;
  const symbols = (process.env.FEED_SYMBOLS || '').split(',').filter(Boolean);
  const intervals = (process.env.BAR_INTERVALS || '1m').split(',').filter(Boolean) as Array<
    '1m' | '5m'
  >;
  let subs = 0;
  for (const s of symbols) {
    for (const int of intervals) {
      client.subscribeBars(s, int, (bar) => {
        jobManager.beat('FEED');
        publish(`bars.${int}` as any, bar);
      });
      subs++;
    }
    client.subscribeQuotes(s, (q) => {
      jobManager.beat('FEED');
      publish('quotes.last', q);
    });
    subs++;
  }
  marketFeed.subs = subs;
}

async function stop(): Promise<void> {
  await client?.close();
  client = null;
  marketFeed.connected = false;
  marketFeed.subs = 0;
}

export function registerFeedJob(): void {
  jobManager.register('FEED', start, stop);
}
