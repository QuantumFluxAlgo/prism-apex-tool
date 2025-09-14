// Local app-only lint knobs (extends workspace flat config via merge)
module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // keep console relaxed here (warn), prod apps stay strict via workspace config
        'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
        // underscore-prefixed are intentional
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      }
    },
    {
      files: ['src/__tests__/**/*.{ts,tsx,js,jsx}','**/*.spec.*','**/*.test.*'],
      rules: {
        'import/no-extraneous-dependencies': 'off'
      }
    }
  ]
}
