import type { StrategyKey } from '../dto/strategy-config/types.js';
import { freezeStrategyConfig } from '../services/strategy-config/freeze.js';

function parseStrategy(raw: string | undefined): StrategyKey | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return value === 'orr' || value === 'osb' || value === 'vwap_ft' ? (value as StrategyKey) : null;
}

function parseVersion(raw: string | undefined): number {
  if (!raw) {
    throw new Error('FREEZE_VERSION is required');
  }
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid FREEZE_VERSION "${raw}"`);
  }
  return parsed;
}

async function main(): Promise<void> {
  try {
    const strategy = parseStrategy(process.env.FREEZE_STRATEGY);
    if (!strategy) {
      throw new Error('Invalid FREEZE_STRATEGY (expected orr|osb|vwap_ft)');
    }

    const version = parseVersion(process.env.FREEZE_VERSION);
    const operator = process.env.FREEZE_OPERATOR ?? null;

    const result = await freezeStrategyConfig(strategy, version, operator);

    console.log(
      JSON.stringify(
        {
          source: 'strategyConfigFreezeCli',
          result,
        },
        null,
        2,
      ),
    );
    process.exitCode = 0;
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    console.error(`[strategyConfigFreezeCli] ${message}`);
    process.exitCode = 1;
  }
}

void main();
