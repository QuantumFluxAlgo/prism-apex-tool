import parser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['dist'],
    languageOptions: {
      parser,
    },
    rules: {},
  },
];
