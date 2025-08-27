import fs from 'node:fs';

export type ApexRulesCfg = {
  minRR: number;
  maxRR: number;
  eodFlatCutoffET: string; // "HH:MM:SS" in America/New_York
  halfSizeUntilBufferCleared: boolean;
};

export function loadApexRules(): ApexRulesCfg {
  const url = new URL('../../../configs/rules/apex.json', import.meta.url);
  const raw = fs.readFileSync(url, 'utf-8');
  const data = JSON.parse(raw);
  const keys: (keyof ApexRulesCfg)[] = [
    'minRR',
    'maxRR',
    'eodFlatCutoffET',
    'halfSizeUntilBufferCleared',
  ];
  for (const k of keys) {
    if (!(k in data)) throw new Error(`Missing key ${k} in apex config`);
  }
  return data as ApexRulesCfg;
}
