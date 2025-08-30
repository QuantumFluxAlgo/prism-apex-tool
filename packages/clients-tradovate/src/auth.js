import { TradovateClientError } from './types.js';
export async function login(env) {
  const resp = await fetch(`${env.restBase}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: env.user,
      password: env.password,
      appId: env.appId,
      appVersion: env.appVersion,
      cid: env.cid,
      sec: env.sec,
      deviceId: env.deviceId,
    }),
  });
  if (!resp.ok) throw new TradovateClientError(`auth ${resp.status}`);
  const data = await resp.json();
  return {
    accessToken: String(data.accessToken || ''),
    mdAccessToken: String(data.mdAccessToken || ''),
    userId: Number(data.userId || 0),
    expiresAt: Date.now() + Number(data.expiresIn || data.expirationTime || 0) * 1000,
  };
}
