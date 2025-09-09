/* eslint import/no-extraneous-dependencies: ["error", { devDependencies: true }] */
/**
 * Augmented overrides: include eslint-plugin-unused-imports to auto-remove
 * unused imports and tolerate underscore placeholders for unused vars/args.
 */
const unusedImports = require('eslint-plugin-unused-imports');

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
    // Global (all files) rules for unused imports/vars
    {
      plugins: {
        'unused-imports': unusedImports,
      },
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // Remove unused imports automatically
        'unused-imports/no-unused-imports': 'error',
        // Flag (and autofix) unused vars, but allow underscores
        'unused-imports/no-unused-vars': [
          'warn',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};

// L4: scope console usage to warn in test + scripts only
module.exports.overrides = [
  ...(module.exports.overrides || []),
  {
    files: [
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*',
      'scripts/**',
      'tools/**'
    ],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
];
