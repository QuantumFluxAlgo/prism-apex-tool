import parser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['dist'],
    languageOptions: {
      parser,
    },
    plugins: { import: pluginImport },
    rules: {
      'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
    },
  },
];
