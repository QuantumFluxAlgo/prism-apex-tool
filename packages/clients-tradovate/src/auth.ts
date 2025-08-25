import { TradovateClientError } from './types.js';

export interface AuthEnv {
  restBase: string;
  appId: string;
  appVersion: string;
  user: string;
  password: string;
  cid: string;
  sec: string;
  deviceId: string;
}

export interface TokenBundle {
  accessToken: string;
  mdAccessToken: string;
  userId: number;
  expiresAt: number;
}

export async function login(env: AuthEnv): Promise<TokenBundle> {
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
  const data = (await resp.json()) as any;
  return {
    accessToken: String(data.accessToken || ''),
    mdAccessToken: String(data.mdAccessToken || ''),
    userId: Number(data.userId || 0),
    expiresAt: Date.now() + Number(data.expiresIn || data.expirationTime || 0) * 1000,
  };
}
