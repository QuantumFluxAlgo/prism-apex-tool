// Root flat ESLint config (ESLint v9)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import pluginImport from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  { ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/*.d.ts'] },

  // Base JS + TS recommendations (fast, non-type-checked)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Global settings for Node & ESM repos
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
    },
  },

  // Monorepo-wide rule tuning
  {
    plugins: {
      import: pluginImport,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Keep noise low; we’ll tighten in a later CI hardening PR
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'off',

      // Some packages may still reference this rule; keep it off.
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
    },
  },
];
