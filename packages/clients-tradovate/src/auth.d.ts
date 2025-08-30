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
export declare function login(env: AuthEnv): Promise<TokenBundle>;
//# sourceMappingURL=auth.d.ts.map
