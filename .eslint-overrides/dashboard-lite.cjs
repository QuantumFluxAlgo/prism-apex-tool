// dashboard-lite specific lint scoping (no change to other packages)
module.exports = {
  overrides: [
    {
      files: ['apps/dashboard-lite/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
  ],
};
