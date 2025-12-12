/**
 * Prism Apex – legacy rules shim
 *
 * This file exists to satisfy the import from packages/rules-apex/src/index.ts.
 * The current build does not depend on any real legacy rule logic, so we keep
 * this module deliberately minimal.
 *
 * If/when you need to resurrect legacy rule behaviour, implement it here and
 * wire it through index.ts and the call sites.
 */

/**
 * Placeholder array of legacy rules.
 * Add concrete rule objects here if you need them later.
 */
export const legacyRules = [];

/**
 * Default export – keeps things safe if index.ts or downstream code
 * ever imports the module as a default.
 */
const legacy = {
  legacyRules,
};

export default legacy;
