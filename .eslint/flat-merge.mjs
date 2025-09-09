// Compose base flat config with our targeted overrides (no mutation).
import baseConfig from '../eslint.config.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Our overrides are CommonJS exports from .eslint-overrides/ts-tests-overrides.cjs
const overridesMod = require('../.eslint-overrides/ts-tests-overrides.cjs');
const overrides = Array.isArray(overridesMod?.overrides) ? overridesMod.overrides : [];

const base = Array.isArray(baseConfig) ? baseConfig : (baseConfig ? [baseConfig] : []);
export default [...base, ...overrides];
