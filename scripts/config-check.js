/* Zero-dep CLI to validate config files */
const fs = require('node:fs');
const path = require('node:path');

function readJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to read ${p}: ${e.message}`);
  }
}

/* ---- Accounts strict validation (mirrors packages/accounts/src/schema.ts) ---- */
function isPositiveInt(n){ return typeof n==='number' && Number.isInteger(n) && n>0 }
function isNonNegativeInt(n){ return typeof n==='number' && Number.isInteger(n) && n>=0 }
function isFiniteNum(n){ return typeof n==='number' && Number.isFinite(n) }
const ACC_KEYS = new Set(['name','accountId','accountSpec','mode','planMaxContracts','baseSize','multiplier','minQty']);

function validateAccountsConfig(obj){
  if (!obj || typeof obj!=='object') throw new Error('accounts.json: not an object');
  if (!Array.isArray(obj.accounts) || obj.accounts.length<1) throw new Error('"accounts" must be a non-empty array');
  obj.accounts.forEach((a, i) => {
    if (!a || typeof a!=='object') throw new Error(`accounts[${i}] must be an object`);
    Object.keys(a).forEach(k => { if (!ACC_KEYS.has(k)) throw new Error(`accounts[${i}]: unknown key "${k}"`)});
    if (typeof a.name!=='string' || !a.name.trim()) throw new Error(`accounts[${i}].name must be a non-empty string`);
    if (!isPositiveInt(a.accountId)) throw new Error(`accounts[${i}].accountId must be a positive integer`);
    if (typeof a.accountSpec!=='string' || !a.accountSpec.trim()) throw new Error(`accounts[${i}].accountSpec must be a non-empty string`);
    if (a.mode!=='eval' && a.mode!=='funded') throw new Error(`accounts[${i}].mode must be "eval" or "funded"`);
    if (!isPositiveInt(a.planMaxContracts)) throw new Error(`accounts[${i}].planMaxContracts must be a positive integer`);
    const baseSize = a.baseSize ?? 1;
    const multiplier = a.multiplier ?? 1;
    const minQty = a.minQty ?? 1;
    if (!isPositiveInt(baseSize)) throw new Error(`accounts[${i}].baseSize must be a positive integer`);
    if (!isFiniteNum(multiplier) || multiplier<=0) throw new Error(`accounts[${i}].multiplier must be a positive number`);
    if (!isNonNegativeInt(minQty)) throw new Error(`accounts[${i}].minQty must be an integer >= 0`);
  });
}

/* ---- Strategy generic validation ---- */
function validateStrategyConfig(obj, strategyFile){
  if (!obj || typeof obj!=='object') throw new Error(`${strategyFile}: not an object`);
  for (const [k,v] of Object.entries(obj)){
    if (typeof v==='number'){
      if (!Number.isFinite(v)) throw new Error(`${strategyFile}: "${k}" must be a finite number`);
      if (/(bars?|minutes?|ticks?|lookback|cooldown|count|period|window)$/i.test(k) && v<0){
        throw new Error(`${strategyFile}: "${k}" must be >= 0`);
      }
      continue;
    }
    if (typeof v==='string' && /(time|start|end)$/i.test(k)){
      if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) {
        throw new Error(`${strategyFile}: "${k}" must be "HH:MM" or "HH:MM:SS"`);
      }
      continue;
    }
    throw new Error(`${strategyFile}: "${k}" must be a number`);
  }
}

/* ---- Runner ---- */
(function main(){
  const root = process.cwd();

  // Accounts
  const accPath = path.resolve(root, 'configs', 'accounts.json');
  if (fs.existsSync(accPath)) {
    validateAccountsConfig(readJson(accPath));
  } else {
    console.log('INFO: configs/accounts.json not found (skip)');
  }

  // Strategies
  const stratDir = path.resolve(root, 'configs', 'strategies');
  if (fs.existsSync(stratDir)) {
    const files = fs.readdirSync(stratDir).filter(f => f.endsWith('.json') && !f.endsWith('.example.json'));
    for (const f of files){
      const p = path.join(stratDir, f);
      validateStrategyConfig(readJson(p), `configs/strategies/${f}`);
    }
  } else {
    console.log('INFO: configs/strategies/ not found (skip)');
  }

  console.log('All configs valid');
})();
