/**
 * Narrow ESLint overrides for the monorepo:
 * - Allow underscore-prefixed unused vars/args/caughtErrors in TS/TSX
 * - Allow devDependencies in test files
 */
module.exports = {
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      files: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.test.jsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.spec.js',
        '**/*.spec.jsx',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: true },
        ],
      },
    },
  ],
};
