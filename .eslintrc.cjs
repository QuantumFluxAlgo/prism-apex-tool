/* Minimal TS ESLint for sanity without excessive noise */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  ignorePatterns: [
    '**/dist/**',
    '**/coverage/**',
    'reports/**',
    'node_modules/**'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: false,
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off'
  }
};
