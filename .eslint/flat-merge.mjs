/**
 * Flat ESLint config merger for the monorepo.
 * - Imports base flat config (ESM) and overlay CJS overrides safely.
 * - Exports a SINGLE default array for ESLint to consume.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// Base flat config (ESM default export should be an array)
import base from '../eslint.config.mjs'

// Optional CommonJS override modules
let tests = {}
let dl = {}
let dlApp = {}
try { tests = require('../.eslint-overrides/ts-tests-overrides.cjs') } catch {}
try { dl    = require('../.eslint-overrides/dashboard-lite.cjs') } catch {}
try { dlApp = require('../apps/dashboard-lite/.eslint.app.cjs') } catch {}

// Normalize possible shapes to an array of flat-config items
const toArr = (x) => Array.isArray(x) ? x : (x?.overrides ? x.overrides : (x ? [x] : []))

export default [
  ...toArr(base),
  ...toArr(tests),
  ...toArr(dl),
  ...toArr(dlApp),
]
