'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.loadAccounts = loadAccounts;
exports.getAccounts = getAccounts;
const node_fs_1 = require('node:fs');
const node_path_1 = __importDefault(require('node:path'));
function validateRecord(a) {
  if (!a.name) throw new Error('name required');
  if (typeof a.accountId !== 'number') throw new Error('accountId must be number');
  if (!a.accountSpec) throw new Error('accountSpec required');
  if (a.mode !== 'eval' && a.mode !== 'funded') throw new Error('mode invalid');
  if (typeof a.planMaxContracts !== 'number') throw new Error('planMaxContracts required');
  if (typeof a.baseSize !== 'number') throw new Error('baseSize required');
  if (a.multiplier !== undefined && typeof a.multiplier !== 'number')
    throw new Error('multiplier must be number');
  if (a.minQty !== undefined && typeof a.minQty !== 'number')
    throw new Error('minQty must be number');
}
function loadAccounts(filePath = node_path_1.default.resolve('configs/accounts.json')) {
  const data = JSON.parse((0, node_fs_1.readFileSync)(filePath, 'utf8'));
  if (!Array.isArray(data.accounts)) throw new Error('accounts must be array');
  for (const a of data.accounts) validateRecord(a);
  return data;
}
function getAccounts() {
  return loadAccounts().accounts;
}
