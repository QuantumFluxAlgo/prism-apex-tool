// Minimal flat ESLint config for apps/api (ESLint v9)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'coverage/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended, // non-type-checked, fast and stable
  {
    files: ['**/*.ts'],
    rules: {
      // Keep lint noise low for the API right now
      '@typescript-eslint/no-explicit-any': 'off',
      // Do NOT require plugins we don't use here (e.g., simple-import-sort)
    },
  },
  {
    files: ['src/__tests__/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
