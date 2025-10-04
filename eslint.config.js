/**
 * Minimal flat-config shim that:
 *  - Adds an `ignores` array to replace the legacy .eslintignore
 *  - Reuses the existing flat merge config when present
 *
 * No rule changes are introduced; this only centralises ignores to silence
 * the deprecation warning emitted by recent ESLint versions.
 */
import fs from "node:fs";

const baseConfigPath = "./.eslint/flat-merge.mjs";
let baseConfigs = [];

if (fs.existsSync(baseConfigPath)) {
  const mod = await import(baseConfigPath);
  baseConfigs = (mod?.default ?? mod?.config ?? []);
}

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.tmp/**",
      "**/.turbo/**",
      "apps/api/dist-cjs/**",
      "**/.eslintcache",
      "**/coverage/**",
      "docs/scan/**",
    ],
  },
  ...baseConfigs,
];
