import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

type PackageJSON = { name?: string; version?: string };

type Nullable<T> = T | null;

function findPackageJSON(): Nullable<PackageJSON> {
  const searchRoots = new Set<string>();
  const entryPoint = process.argv[1];
  if (entryPoint) {
    searchRoots.add(path.dirname(entryPoint));
  }
  if (process.env.PWD) {
    searchRoots.add(process.env.PWD);
  }
  searchRoots.add(process.cwd());

  const visited = new Set<string>();
  let fallback: Nullable<PackageJSON> = null;

  for (const initial of searchRoots) {
    let dir = initial;
    while (!visited.has(dir)) {
      visited.add(dir);
      const candidate = path.join(dir, 'package.json');
      try {
        if (fs.existsSync(candidate)) {
          const data = JSON.parse(fs.readFileSync(candidate, 'utf8')) as PackageJSON;
          if (typeof data.version === 'string' && data.version.length > 0) {
            return data;
          }
          if (!fallback && data) {
            fallback = data;
          }
        }
      } catch {
        // continue walking upward when JSON is unreadable
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }

  return fallback;
}

function getGitCommit(): string | null {
  const envCommit =
    process.env.GIT_COMMIT ||
    process.env.GIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    null;

  if (envCommit) {
    return envCommit;
  }

  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return sha || null;
  } catch {
    return null;
  }
}

export default async function versionRoute(fastify: FastifyInstance) {
  fastify.get('/version', async (_req, _rep) => {
    try {
      const envVersion = process.env.APP_VERSION || process.env.APP_BUILD_VERSION || null;
      const pkg = findPackageJSON() ?? {};
      const name = pkg.name || 'prism-apex-tool';
      const version = envVersion || pkg.version || '0.0.0-dev';
      const commit = getGitCommit();

      return {
        name,
        version,
        commit,
        node: process.version,
        env: process.env.NODE_ENV || 'development',
      };
    } catch {
      return {
        name: 'prism-apex-tool',
        version: '0.0.0-dev',
        commit: null,
        node: process.version,
        env: process.env.NODE_ENV || 'development',
        error: 'version-route-fallback',
      };
    }
  });
}
