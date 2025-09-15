declare module '@prism-apex/accounts' {
  export type AccountMode = 'eval' | 'funded';

  export interface AccountRecord {
    name: string;
    accountId: number;
    accountSpec: string;
    mode: AccountMode;
    planMaxContracts: number;
    baseSize: number;
    multiplier?: number;
    minQty?: number;
  }

  export interface AccountsFile {
    accounts: AccountRecord[];
  }

  export function loadAccounts(filePath?: string): AccountsFile;
  export function getAccounts(): AccountRecord[];
}
