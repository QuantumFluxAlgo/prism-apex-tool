import type { StrategyKey } from '../dto/strategy-config/types.js';
import { getStrategyDrift } from '../services/strategy-config/drift.js';

function parseStrategy(raw: string | undefined): StrategyKey | null {
  const v = raw?.trim().toLowerCase();
  return v === 'orr' || v === 'osb' || v === 'vwap_ft' ? (v as StrategyKey) : null;
}

async function main(): Promise<void> {
  try {
    const strategy = parseStrategy(process.env.DRIFT_STRATEGY);
    if (!strategy) {
      throw new Error('Invalid DRIFT_STRATEGY (expected orr|osb|vwap_ft)');
    }

    const report = await getStrategyDrift(strategy);
    console.log(
      JSON.stringify(
        {
          source: 'strategyConfigDriftCli',
          report,
        },
        null,
        2,
      ),
    );

    process.exitCode = report.isDrift ? 1 : 0;
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
    console.error(`[strategyConfigDriftCli] ${message}`);
    process.exitCode = 1;
  }
}

void main();
