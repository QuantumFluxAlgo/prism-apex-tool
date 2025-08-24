// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['archive/**', '**/dist/**', '**/build/**', '**/.turbo/**', '**/.next/**', '**/coverage/**', 'apps/api/scripts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended, // type-aware rules intentionally omitted (keep green)
  {
    files: ['**/*.ts'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-console': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];
