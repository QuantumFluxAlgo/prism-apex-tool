/**
 * Dashboard-only ESLint config.
 * Forces ESLINT_USE_FLAT_CONFIG=false via package script to bypass the root flat config.
 */
module.exports = {
  root: false,
  env: {
    browser: true,
    es2021: true,
    node: false,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off',
  },
  overrides: [
    {
      files: ['*.tsx', '**/*.tsx'],
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  ],
};
