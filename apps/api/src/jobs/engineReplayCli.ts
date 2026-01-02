import type { StrategyKey } from '../dto/strategy-engine/types.js';
import { runEngineReplayJob } from './engineReplayRunner.js';

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseRisk(value: string | undefined): number | undefined {
  if (!value || !value.trim().length) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const STRATEGY_VALUES: StrategyKey[] = ['orr', 'osb', 'vwapft'];

function parseStrategies(value: string | undefined): StrategyKey[] {
  const items = parseList(value);
  return items.filter((item): item is StrategyKey => STRATEGY_VALUES.includes(item as StrategyKey));
}

async function main(): Promise<void> {
  const strategies = parseStrategies(process.env.ENGINE_REPLAY_STRATEGIES);
  const symbols = parseList(process.env.ENGINE_REPLAY_SYMBOLS);
  const sessionDates = parseList(process.env.ENGINE_REPLAY_DATES);
  const maxRisk = parseRisk(process.env.ENGINE_REPLAY_MAX_RISK);

  if (!strategies.length || !symbols.length || !sessionDates.length) {
    console.error(
      [
        '[engineReplayCli] Missing inputs.',
        'Set ENGINE_REPLAY_STRATEGIES, ENGINE_REPLAY_SYMBOLS, ENGINE_REPLAY_DATES (comma-separated).',
        'Example:',
        '  ENGINE_REPLAY_STRATEGIES="orr,osb,vwapft" \\',
        '  ENGINE_REPLAY_SYMBOLS="ES,NQ" \\',
        '  ENGINE_REPLAY_DATES="2025-01-15,2025-01-16" \\',
        '  pnpm --filter @prism-apex/api replay:engine',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  try {
    const summary = await runEngineReplayJob({
      strategies,
      symbols,
      sessionDates,
      maxRiskDollarsPerTrade: maxRisk,
      meta: { cli: true },
    });

    if (summary.failed > 0) {
      console.error(
        `[engineReplayCli] Completed with failures: ${summary.failed} of ${summary.totalSessions} sessions failed`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `[engineReplayCli] Completed successfully: ${summary.totalSessions} sessions, 0 failures`,
      );
      process.exitCode = 0;
    }
  } catch (err: unknown) {
    const message =
      typeof err === 'object' && err && 'message' in err
        ? String((err as { message: string }).message)
        : String(err);
    console.error(`[engineReplayCli] Unexpected error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
