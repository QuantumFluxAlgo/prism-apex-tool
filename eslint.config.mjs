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
      // Keep noise low but catch obvious foot-guns (WARN ONLY)
      'no-console': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef': 'off',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',

      // Some packages may still reference this rule; keep it off.
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',

      // Surface missing deps as warnings; allow devDeps in tests/config only
      'import/no-extraneous-dependencies': [
        'warn',
        {
          devDependencies: [
            '**/*.spec.*',
            '**/__tests__/**',
            '**/vitest.config.*',
            '**/*.config.*',
            '**/src/tests/**',
          ],
        },
      ],
    },
  },

  // Tests stay loose/ergonomic
  {
    files: ['**/__tests__/**', '**/*.spec.*', '**/src/tests/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
