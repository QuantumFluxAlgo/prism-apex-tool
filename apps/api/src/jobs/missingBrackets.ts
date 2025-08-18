import { TradovateClient } from '../../../../packages/clients-tradovate/src/rest';
import { store } from '../store';
import { notify } from './util';

/**
 * Scan working orders; if any active entry lacks OCO stop/target -> CRITICAL.
 * Also set a store flag so the dashboard can hard pause copy.
 */
export async function jobMissingBrackets() {
  if (!process.env.TRADOVATE_BASE_URL) return; // env not configured
  const client = new TradovateClient();
  const orders = await client.getOrders() as any[];

  const working = orders.filter(o => o.status === 'WORKING');
  const anyMissing = working.length > 0 && !working.some(o => o.ocoGroupId);

  store.setOcoMissing(anyMissing);

  if (anyMissing) {
    await notify('OCO_MISSING', 'CRITICAL', 'Missing OCO brackets', 'Detected working orders without OCO stop/targets. Hard pause engaged.', ['OCO_MISSING']);
  }
}
