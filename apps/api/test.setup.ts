/**
 * Ensure TS path aliases in tests work under Node by registering tsconfig paths.
 * Vitest also receives vite-tsconfig-paths plugin for Vite-level resolution.
 */
import 'tsconfig-paths/register';

process.env.TEST_MODE = process.env.TEST_MODE ?? '1';
process.env.MOCK_DB = process.env.MOCK_DB ?? '1';
